var MDE;
(function (MDE) {
    function objectMatches(a, b) {
        var keys = _.intersection(_.keys(a), _.keys(b));
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            var v1 = a[key] + '';
            var v2 = b[key] + '';
            if (v1.toUpperCase() != v2.toUpperCase()) {
                return false;
            }
        }
        return true;
    }
    var Explorer = (function () {
        function Explorer() {
            var _this = this;
            this.boardsel = [];
            this.boards = [];
            this.currentBoard = null;
            this.guid = generateUUID();
            this.existingSubscriptions = [];
            console.log('Loading mde....');
            if (!$('.mde-root').exists()) {
                var html = "\n\t\t\t\t<div class='mde-root hidden'>\n\t\t\t\t<div class='closer'></div>\n\t\t\t\t<div class='more'></div>\n\t\t\t\t\t<div class='mde-title-bar'>\n\t\t\t\t\t\t<div class='title'></div>\n\t\t\t\t\t</div>\n\t\t\t\t\t<div class='mde-boards'>\n\t\t\t\t\t\t<div class='mde-board first'>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class='mde-board second'>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t\t";
                var el_1 = $(html);
                $('body').append(el_1);
                el_1.click(function () {
                    // el.toggleClass('hidden');
                });
                var self_1 = this;
                el_1.on('click', '.object_link', function (evnt) {
                    evnt.preventDefault();
                    evnt.stopPropagation();
                    var a = $(this);
                    var ok = a.attr('ok');
                    var ot = a.attr('ot');
                    self_1.addBoard(ot, ok, ot, null);
                });
                el_1.find('.closer').on('click', function (evnt) {
                    _this.hide();
                });
                el_1.find('.more').on('click', function (evnt) {
                    _this.loadMore();
                    el_1.find('.more').addClass('hide');
                    setTimeout(function () {
                        el_1.animate({ scrollTop: $(el_1).height() - $(el_1).scrollTop() });
                    }, 500);
                });
            }
            this.root = $('.mde-root');
            this.breadCrumbEl = this.root.find('.mde-title-bar > .title');
            this.boardsel.push(this.root.find('.mde-boards > .mde-board.first'));
            this.boardsel.push(this.root.find('.mde-boards > .mde-board.second'));
        }
        Explorer.prototype.createBoard = function (objectType, objectKey, title, context) {
            if (context === void 0) { context = null; }
            var board = new Board(this, objectType, objectKey, title, context);
            return board;
        };
        Explorer.prototype.findBoard = function (objectType, objectKey) {
            for (var _i = 0, _a = this.boards; _i < _a.length; _i++) {
                var board = _a[_i];
                if (board.objectType != objectType)
                    continue;
                if (board.id != objectKey)
                    continue;
                return board;
            }
            return null;
        };
        Explorer.prototype.clearBoards = function () {
            this.boards = [];
            for (var _i = 0, _a = this.existingSubscriptions; _i < _a.length; _i++) {
                var s = _a[_i];
                ServiceDesk.MessageBus.unsubscribe(s);
            }
            for (var _b = 0, _c = this.boardsel; _b < _c.length; _b++) {
                var e = _c[_b];
                e.empty();
            }
            this.existingSubscriptions = [];
            this.currentBoard = null;
            this.updateBreadCrumb();
        };
        Explorer.prototype.addBoard = function (objectType, objectKey, title, context) {
            var board = this.createBoard(objectType, objectKey, title, context);
            this.boards.push(board);
            this.updateBreadCrumb();
            this.switchToBoard(board);
            return board;
        };
        Explorer.prototype.switchToBoard = function (board) {
            var _this = this;
            var currentBoard = this.currentBoard;
            if (board == currentBoard)
                return;
            console.log('switching boards', this.currentBoard, '->', board);
            var cardsToRemove = [];
            if (null != currentBoard) {
                for (var _i = 0, _a = currentBoard.cards; _i < _a.length; _i++) {
                    var card = _a[_i];
                    if (!!card.el) {
                        console.log('removing', card, 'from', currentBoard);
                        card.el.addClass('hide');
                        cardsToRemove.push(card);
                    }
                }
            }
            this.connectBoardToLucy(board);
            setTimeout(function () {
                _this.currentBoard = board;
                // let board = this.currentBoard;
                for (var _i = 0, cardsToRemove_1 = cardsToRemove; _i < cardsToRemove_1.length; _i++) {
                    var card = cardsToRemove_1[_i];
                    card.el.remove();
                    card.el.removeClass('hide');
                    card.el = null;
                }
                for (var _a = 0, _b = board.cards; _a < _b.length; _a++) {
                    var card = _b[_a];
                    if (!!card.el) {
                        console.log('EXISTING', card);
                        card.el.removeClass('hide');
                        continue;
                    }
                    var _c = _this.nextAvailableBoard(), nextBoard = _c[0], pos = _c[1];
                    console.log('/Adding card to UI', card, board.objectType);
                    card.render(nextBoard, pos);
                }
            }, 500);
        };
        Explorer.prototype.channelNameForBoard = function (board) {
            var ot = board.objectType;
            var ok = board.id + '';
            var channel = "/mde/" + this.guid + "-" + ot.toLowerCase() + "-" + ok.toLowerCase();
            return channel;
        };
        Explorer.prototype.connectBoardToLucy = function (board) {
            var _this = this;
            ServiceDesk.MessageBus.init(function () {
                for (var _i = 0, _a = _this.existingSubscriptions; _i < _a.length; _i++) {
                    var s = _a[_i];
                    ServiceDesk.MessageBus.unsubscribe(s);
                }
                _this.existingSubscriptions = [];
                var channel = _this.channelNameForBoard(board);
                ServiceDesk.MessageBus.subscribe(channel, function (message, channel) {
                    var obj = JSON.parse(message);
                    console.log('Loading board', message);
                    if (obj.cardType == 'smartwall') {
                        board.addSmartWallCard(obj.wall, obj.widget, obj.parameters || {});
                    }
                    else {
                        board.addViewCard(obj.app, obj.view, obj.parameters || {});
                    }
                });
                _this.existingSubscriptions.push(channel);
                ServiceDesk.executeService('System', 'FireEvent', {
                    'EventID': '/mde/objectloaded',
                    'ObjectType': board.objectType,
                    'ObjectKey': board.id,
                    'Context': JSON.stringify(board.context),
                    'GUID': channel
                }, null, null);
            });
        };
        Explorer.prototype.loadMore = function () {
            var board = this.currentBoard;
            if (board == null)
                return;
            var channel = this.channelNameForBoard(board);
            ServiceDesk.executeService('System', 'FireEvent', {
                'EventID': '/mde/objectmore',
                'ObjectType': board.objectType,
                'ObjectKey': board.id,
                'Context': JSON.stringify(board.context),
                'GUID': channel
            }, null, null);
        };
        Explorer.prototype.onCardAdded = function (board, card) {
            if (board == this.currentBoard) {
                console.log('Adding card to UI', card, board.objectType);
                var _a = this.nextAvailableBoard(), nextBoard = _a[0], pos = _a[1];
                card.render(nextBoard, pos);
            }
        };
        Explorer.prototype.nextAvailableBoard = function () {
            var selected = null;
            var minHeight = null;
            var selectedIndex = 0;
            var index = 0;
            var _loop_1 = function (b) {
                var height = 0;
                b.find('.mde-card').each(function (i, elm) {
                    height += $(elm).height();
                });
                if ((minHeight == null) || (minHeight > height)) {
                    minHeight = height;
                    selected = b;
                    selectedIndex = index;
                }
                index++;
            };
            for (var _i = 0, _a = this.boardsel; _i < _a.length; _i++) {
                var b = _a[_i];
                _loop_1(b);
            }
            var pos = 1;
            if (selectedIndex > 0 && selectedIndex < this.boardsel.length - 1) {
                pos = 0;
            }
            if (selectedIndex == this.boardsel.length - 1)
                pos = -1;
            if (!!selected) {
                return [selected, pos];
            }
            return [this.boardsel[0], 1];
        };
        Explorer.prototype.show = function () {
            this.root.removeClass('hidden');
        };
        Explorer.prototype.hide = function () {
            this.root.addClass('hidden');
        };
        Explorer.prototype.updateBreadCrumb = function () {
            var _this = this;
            this.breadCrumbEl.empty();
            var i = 0;
            var _loop_2 = function (board) {
                var j = i++;
                var a = $('<a />');
                a.addClass('obj');
                a.data('objectType', board.objectType);
                a.data('id', board.id);
                a.text(board.title);
                this_1.breadCrumbEl.append(a);
                a.on('click', function (evnt) {
                    _this.boards.splice(j + 1, _this.boards.length - j + 1);
                    _this.updateBreadCrumb();
                    _this.switchToBoard(board);
                });
            };
            var this_1 = this;
            for (var _i = 0, _a = this.boards; _i < _a.length; _i++) {
                var board = _a[_i];
                _loop_2(board);
            }
        };
        Explorer.show = function (objectType, objectKey, title, context) {
            if (objectType === void 0) { objectType = ''; }
            if (objectKey === void 0) { objectKey = ''; }
            if (title === void 0) { title = ''; }
            if (context === void 0) { context = null; }
            if (!Explorer._explorer) {
                Explorer._explorer = new Explorer();
            }
            if (!!objectType && !!objectKey) {
                Explorer._explorer.clearBoards();
                Explorer._explorer.addBoard(objectType, objectKey, title, context);
            }
            Explorer._explorer.show();
        };
        return Explorer;
    }());
    MDE.Explorer = Explorer;
    var Board = (function () {
        function Board(parent, objectType, id, title, context) {
            this.context = {};
            this.parent = parent;
            this.objectType = objectType;
            this.id = id;
            this.title = title;
            this.cards = [];
            this.context = context;
        }
        Board.prototype.addSmartWallCard = function (wall, widget, params) {
            var card = new SmartWallCard(wall, widget, params);
            this.addCard(card);
        };
        Board.prototype.addCard = function (card) {
            for (var _i = 0, _a = this.cards; _i < _a.length; _i++) {
                var ec = _a[_i];
                if (ViewCard.equals(ec, card)) {
                    console.log('Card', card, 'exists in board', this);
                    return;
                }
            }
            this.cards.push(card);
            this.parent.onCardAdded(this, card);
        };
        Board.prototype.addViewCard = function (app, view, params) {
            var card = new ViewCard(app, view, params);
            this.addCard(card);
        };
        return Board;
    }());
    MDE.Board = Board;
    var ViewCard = (function () {
        function ViewCard(app, view, parameters) {
            if (app === void 0) { app = ''; }
            if (view === void 0) { view = ''; }
            if (parameters === void 0) { parameters = null; }
            this.app = app;
            this.view = view;
            this.parameters = parameters;
        }
        ViewCard.prototype.cardKey = function () {
            return this.app.toLowerCase() + '/' + this.view.toLowerCase();
        };
        ViewCard.prototype.cardParameters = function () {
            return this.parameters;
        };
        ViewCard.equals = function (card1, card2) {
            return (card1.cardKey() == card2.cardKey())
                && objectMatches(card1.cardParameters(), card2.cardParameters());
        };
        ViewCard.prototype.render = function (parent, pos) {
            var el = $('<div />');
            el.addClass('mde-card');
            el.append($('<div class="body" />'));
            el.append($('<div class="header" />'));
            // el.find('.body').text('');
            el.addClass('waiting');
            ServiceDesk.insertView(el.find('.body'), this.app, this.view, this.parameters, function () {
                el.removeClass('waiting');
            }, function (error) {
                el.removeClass('waiting');
                el.text('ERROR:' + error);
            });
            var like = $('<div />');
            like.addClass('v3icon-heart-2 like');
            like.on('click', function (evnt) {
                like.addClass('clicked');
            });
            el.find('.header').append(like);
            el.addClass('loading');
            parent.append(el);
            el.removeClass('loading');
            el.addClass('slide-' + pos);
            this.el = el;
            return el;
        };
        return ViewCard;
    }());
    MDE.ViewCard = ViewCard;
    var SmartWallCard = (function () {
        function SmartWallCard(wall, widget, parameters) {
            if (wall === void 0) { wall = ''; }
            if (widget === void 0) { widget = ''; }
            if (parameters === void 0) { parameters = null; }
            this.wall = wall;
            this.widget = widget;
            this.parameters = parameters;
        }
        SmartWallCard.prototype.cardKey = function () {
            return 'sw:' + this.wall.toLowerCase() + '/' + this.widget.toLowerCase();
        };
        SmartWallCard.prototype.cardParameters = function () {
            return this.parameters;
        };
        SmartWallCard.prototype.render = function (parent, pos) {
            var el = $('<div />');
            el.addClass('mde-card wall-widget');
            el.append($('<div class="body" />'));
            el.append($('<div class="header" />'));
            // el.find('.body').text('');
            el.addClass('waiting');
            var body = el.find('.body');
            var key = this.wall;
            var widget = this.widget;
            ServiceDesk.executeService('SmartWall', 'WallConfiguration:Details', { 'key': this.wall }, function (data) {
                if (!data || !data.length) {
                    body.html('Unable to find widget');
                    return;
                }
                var config = JSON.parse(data[0]['Configuration'] || {});
                var wall = new window['SmartWall'].SmartWall(body, key, key, config, { singleWidgetMode: true, singleWidgetID: widget });
                el.removeClass('waiting');
                wall.render();
            }, function (err) {
                el.removeClass('waiting');
                body.html(err);
            });
            var like = $('<div />');
            like.addClass('v3icon-heart-2 like');
            like.on('click', function (evnt) {
                like.addClass('clicked');
            });
            el.find('.header').append(like);
            el.addClass('loading');
            parent.append(el);
            el.removeClass('loading');
            el.addClass('slide-' + pos);
            this.el = el;
            return el;
        };
        return SmartWallCard;
    }());
    MDE.SmartWallCard = SmartWallCard;
})(MDE || (MDE = {}));
