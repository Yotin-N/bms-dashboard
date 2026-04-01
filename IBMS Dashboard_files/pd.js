(function() {
  var Action, ActionBlockHeight, ActionBlockWidth, BranchSpace, Brancher, Break, ConditionHeaderHeight, ConditionHeaderWidth, ConditionalBranch, ConnectorHeight, Decision, Delay, ElseBranch, EmptyBranchSpace, EmptyListSpace, EndPointHeight, EndPointWidth, Item, ItemList, Loop, Milestone, Notification, SetVariable, Terminate, Wait, WaitUntil, WorkFlow, blockHighlighter, imageUrl, root, scrollToItem,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _.sum = function(x) {
    var i, s, _i, _len;

    s = 0;
    for (_i = 0, _len = x.length; _i < _len; _i++) {
      i = x[_i];
      s += i;
    }
    return s;
  };

  jQuery.prototype.centerPos = function(x, y) {
    var w2;

    w2 = this.width() * 0.5;
    return this.css({
      left: x - w2,
      top: y
    });
  };

  imageUrl = function(s) {
    return ServiceDesk.rootUrl('images/pv/' + s);
  };

  scrollToItem = function(item) {
    var container, scroll_item, top;

    scroll_item = $(item.highlight_block);
    container = $(scroll_item).offsetParent();
    top = scroll_item.offset().top - container.offset().top + container.scrollTop();
    if (top > 5) {
      top -= 5;
    }
    return container.scrollTop(top);
  };

  blockHighlighter = function(item) {
    var adj, c, c_o, h, h_o, pos;

    h = $('.wfhighlight');
    if (!h.exists()) {
      h = $('<div />').addClass('wfhighlight');
      item.workflow.canvas.append(h);
    }
    c = $(item.highlight_block);
    if (!c.exists()) {
      return;
    }
    pos = c.position();
    h_o = h.offsetParent().offset();
    c_o = c.offsetParent().offset();
    /*
    	TODO: Currently cargo-culting the scroll offset stuff. Figure out how it actually works
    */

    adj = {
      left: h_o.left - c_o.left + h.offsetParent().scrollLeft(),
      top: h_o.top - c_o.top + h.offsetParent().scrollTop()
    };
    return h.css({
      left: pos.left - 5 + adj.left,
      top: pos.top - 5 + adj.top,
      height: c.height() + 10,
      width: c.width() + 10
    });
  };

  EmptyBranchSpace = 50;

  EmptyListSpace = 300;

  BranchSpace = 40;

  ConnectorHeight = 20;

  ConditionHeaderHeight = 50;

  ConditionHeaderWidth = 100;

  ActionBlockWidth = 150;

  ActionBlockHeight = 50;

  EndPointWidth = 15;

  EndPointHeight = 13;

  Item = (function() {
    function Item(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      this.id = this.node.attr('id');
      this.title = this.node.attr('title');
      this.ignore_errors = this.node.attr('ignore_errors') === '1';
      this.type = this.node.attr('type');
      this.workflow.itemMap[this.id] = this;
    }

    Item.prototype.renderSimpleBlock = function() {
      return this.highlight_block = $('<div />').addClass('wfitem wfblock').text(this.title);
    };

    Item.prototype.highlight = function() {
      blockHighlighter(this);
      return scrollToItem(this);
    };

    Item.prototype.render = function(dv, x, y) {
      var element;

      element = this.renderSimpleBlock();
      element.width(this.width());
      element.height(this.height());
      element.appendTo(dv);
      element.centerPos(x, y);
      return y + this.height();
    };

    Item.prototype.width = function() {
      return ActionBlockWidth;
    };

    Item.prototype.height = function() {
      return ActionBlockHeight;
    };

    Item.prototype.centerX = function() {
      return this.width() / 2;
    };

    return Item;

  })();

  ItemList = (function(_super) {
    __extends(ItemList, _super);

    function ItemList(node, parent, workflow) {
      var n;

      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      ItemList.__super__.constructor.call(this, this.node, this.parent, this.workflow);
      this.items = (function() {
        var _i, _len, _ref, _results;

        _ref = this.node.children('Item');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          n = _ref[_i];
          _results.push(WorkFlow.createItem($(n), this, this.workflow));
        }
        return _results;
      }).call(this);
    }

    ItemList.prototype.lastItem = function() {
      if (this.items.length === 0) {
        return null;
      }
      return this.items[this.items.length - 1];
    };

    ItemList.prototype.render = function(dv, x, y) {
      var i, item, o_y, total, _i, _len, _ref;

      total = this.items.length;
      i = 0;
      _ref = this.items;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        o_y = y;
        y = item.render(dv, x, y);
        if (i < total - 1) {
          WorkFlow.addVConnector(dv, item, {
            'x': x,
            'y': y
          }, {
            'x': x,
            'y': y + ConnectorHeight
          });
          y += ConnectorHeight;
        }
        i += 1;
      }
      return y;
    };

    ItemList.prototype.highlight = function() {
      if (this.items.length > 0) {
        return this.items[0].highlight();
      }
    };

    ItemList.prototype.width = function() {
      var item, left_width, right_width;

      left_width = _.max((function() {
        var _i, _len, _ref, _results;

        _ref = this.items;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          _results.push(item.centerX());
        }
        return _results;
      }).call(this));
      right_width = _.max((function() {
        var _i, _len, _ref, _results;

        _ref = this.items;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          _results.push(item.width() - item.centerX());
        }
        return _results;
      }).call(this));
      return Math.max(left_width + right_width, EmptyListSpace);
    };

    ItemList.prototype.__width = function() {
      var i, item;

      if (this.items.length === 0) {
        return EmptyListSpace;
      }
      i = _.max((function() {
        var _i, _len, _ref, _results;

        _ref = this.items;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          _results.push(item.width());
        }
        return _results;
      }).call(this));
      return i;
    };

    ItemList.prototype.centerX = function() {
      var i;

      if (this.items.length === 0) {
        return this.width() / 2;
      }
      return _.max((function() {
        var _i, _len, _ref, _results;

        _ref = this.items;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push(i.centerX());
        }
        return _results;
      }).call(this));
    };

    ItemList.prototype.height = function() {
      var h, item;

      if (this.items.length === 0) {
        return 0;
      }
      h = _.sum(((function() {
        var _i, _len, _ref, _results;

        _ref = this.items;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          _results.push(item.height());
        }
        return _results;
      }).call(this)) + ConnectorHeight * (this.items.length - 1));
      return h;
    };

    return ItemList;

  })(Item);

  Milestone = (function(_super) {
    __extends(Milestone, _super);

    function Milestone(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      Milestone.__super__.constructor.call(this, this.node, this.parent, this.workflow);
    }

    Milestone.prototype.width = function() {
      return 143;
    };

    Milestone.prototype.height = function() {
      return 35;
    };

    Milestone.prototype.centerX = function() {
      return 5;
    };

    Milestone.prototype.render = function(dv, x, y) {
      var orig_x;

      orig_x = x;
      x = x + this.width() * 0.5 - this.centerX();
      WorkFlow.addVConnector(dv, null, {
        x: orig_x,
        y: y
      }, {
        x: orig_x,
        y: y + this.height()
      }, null);
      y = Milestone.__super__.render.call(this, dv, x, y);
      return y;
    };

    Milestone.prototype.renderSimpleBlock = function() {
      var d, img, sp;

      d = $('<div />').addClass('wfmilestone wfblock');
      this.highlight_block = d;
      img = $('<img />');
      img.attr('src', imageUrl('milestone.png'));
      img.css({
        width: '100%',
        height: '100%'
      });
      d.append(img);
      img.css('position', 'absolute');
      sp = $('<span />').text(this.title).addClass('text');
      sp.attr('title', this.title);
      sp.appendTo(d);
      return d;
    };

    return Milestone;

  })(Item);

  WorkFlow = (function(_super) {
    __extends(WorkFlow, _super);

    function WorkFlow(node, parent) {
      this.node = node;
      this.parent = parent;
      this.workflow = this;
      this.itemMap = {};
      WorkFlow.__super__.constructor.call(this, this.node, this.parent, this.workflow);
      this.shape = this.node.attr('shape_hash');
      this.canvas = null;
    }

    WorkFlow.prototype.render = function(dv, x, y) {
      var end, start;

      this.canvas = dv;
      start = $('<div />').addClass('wfstart');
      dv.append(start);
      start.append($('<span />').text('Start').addClass('text'));
      start.centerPos(x, y);
      y += start.height();
      y += WorkFlow.addVConnector(dv, this, {
        x: x,
        y: y
      });
      y = WorkFlow.__super__.render.call(this, dv, x, y);
      y += WorkFlow.addVConnector(dv, this, {
        x: x,
        y: y
      });
      end = $('<div />').addClass('wfend');
      dv.append(end);
      end.centerPos(x, y);
      end.append($('<span />').text('End').addClass('text'));
      y += end.height();
      return y;
    };

    WorkFlow.prototype.highlightItem = function(itemid) {
      var item;

      item = this.itemMap[itemid];
      if (item != null) {
        return item.highlight();
      }
    };

    WorkFlow.createItem = function(node, parent, wf) {
      var item_map, type;

      item_map = {
        'Action': Action,
        'WaitUntil': WaitUntil,
        'Notification': Notification,
        'Wait': Wait,
        'WorkFlow': WorkFlow,
        'Decision': Decision,
        'Milestone': Milestone,
        'Delay': Delay,
        'Loop': Loop,
        'Terminate': Terminate,
        'SetVariable': SetVariable,
        'Break': Break
      };
      type = node.attr('type');
      if (!item_map[type]) {
        throw "Invalid WF Type:" + type;
      }
      return new item_map[type](node, parent, wf);
    };

    WorkFlow.addVConnector = function(dv, item, start, end, parent) {
      var cls, con;

      cls = 'wfvconnector wfblock';
      if (end == null) {
        end = {
          x: start.x,
          y: start.y + ConnectorHeight
        };
      }
      if (parent != null) {
        cls += ' ' + parent.type.toLowerCase();
      }
      con = $('<div />').addClass(cls);
      con.css({
        left: start.x - 2,
        top: start.y
      });
      con.height(end.y - start.y);
      con.appendTo(dv);
      return end.y - start.y;
    };

    return WorkFlow;

  })(ItemList);

  ElseBranch = (function(_super) {
    __extends(ElseBranch, _super);

    function ElseBranch(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      ElseBranch.__super__.constructor.call(this, this.node, this.parent, this.workflow);
    }

    ElseBranch.prototype.render = function(dv, x, y) {
      var bh;

      y += 3;
      bh = $('<div />').addClass('wfcondition_header wfblock ' + this.parent.type.toLowerCase());
      this.highlight_block = bh;
      bh.text('Else');
      bh.width(ConditionHeaderWidth);
      bh.height(ConditionHeaderHeight);
      dv.append(bh);
      bh.centerPos(x, y);
      y += ConditionHeaderHeight;
      WorkFlow.addVConnector(dv, this, {
        'x': x,
        'y': y
      }, {
        'x': x,
        'y': y + ConnectorHeight
      }, this.parent);
      y += ConnectorHeight;
      return ElseBranch.__super__.render.call(this, dv, x, y);
    };

    ElseBranch.prototype.highlight = function() {
      return ElseBranch.__super__.highlight.call(this);
    };

    ElseBranch.prototype.height = function() {
      var h;

      h = ElseBranch.__super__.height.call(this);
      return h + ConditionHeaderHeight;
    };

    ElseBranch.prototype.width = function() {
      var item, left_width, right_width;

      left_width = _.max((function() {
        var _i, _len, _ref, _results;

        _ref = this.items;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          _results.push(item.centerX());
        }
        return _results;
      }).call(this));
      left_width = Math.max(left_width, ConditionHeaderWidth * 0.5);
      right_width = _.max((function() {
        var _i, _len, _ref, _results;

        _ref = this.items;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          _results.push(item.width() - item.centerX());
        }
        return _results;
      }).call(this));
      right_width = Math.max(right_width, ConditionHeaderWidth * 0.5);
      return Math.max(left_width + right_width, EmptyListSpace);
    };

    ElseBranch.prototype.centerX = function() {
      var c;

      c = ElseBranch.__super__.centerX.call(this);
      return Math.max(c, ConditionHeaderWidth * 0.5);
    };

    return ElseBranch;

  })(ItemList);

  WaitUntil = (function(_super) {
    __extends(WaitUntil, _super);

    function WaitUntil(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      WaitUntil.__super__.constructor.call(this, this.node, this.parent, this.workflow);
      this.action = this.node.children('Action').text();
      this.action2 = this.node.children('Action2').text();
      this.operator = this.node.children('Operator').text();
      this.condition_frequency = this.node.children('ConditionFrequency').text();
    }

    WaitUntil.prototype.renderSimpleBlock = function() {
      var d, img, sp, src;

      d = $('<div />').addClass('wfitem wfblock');
      this.highlight_block = d;
      src = imageUrl('wait-until.png');
      img = $('<img />').attr('src', src);
      img.width(25);
      img.css('position', 'absolute');
      img.css({
        left: 4,
        top: 4
      });
      sp = $('<span />').text(this.title).addClass('text');
      sp.attr('title', this.title);
      d.append(img);
      d.append(sp);
      return d;
    };

    return WaitUntil;

  })(Item);

  Notification = (function(_super) {
    __extends(Notification, _super);

    function Notification(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      Notification.__super__.constructor.call(this, this.node, this.parent, this.workflow);
      this.template = this.node.children('Template').text();
    }

    Notification.prototype.renderSimpleBlock = function() {
      var d, img, sp, src;

      d = $('<div />').addClass('wfitem wfblock');
      this.highlight_block = d;
      src = imageUrl('notification.png');
      img = $('<img />').attr('src', src);
      img.css('position', 'absolute');
      img.css({
        left: 4,
        top: 4
      });
      d.append(img);
      sp = $('<span />').text(this.title).addClass('text');
      sp.attr('title', this.title);
      d.append(sp);
      return d;
    };

    return Notification;

  })(Item);

  Delay = (function(_super) {
    __extends(Delay, _super);

    function Delay(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      Delay.__super__.constructor.call(this, this.node, this.parent, this.workflow);
    }

    Delay.prototype.renderSimpleBlock = function() {
      var d, img, sp, src;

      d = $('<div />').addClass('wfitem wfblock');
      this.highlight_block = d;
      src = imageUrl('delay.png');
      img = $('<img />').attr('src', src);
      img.width(25);
      img.css('position', 'absolute');
      img.css({
        left: 4,
        top: 4
      });
      d.append(img);
      sp = $('<span />').text(this.title).addClass('text');
      sp.attr('title', this.title);
      d.append(sp);
      return d;
    };

    return Delay;

  })(Item);

  Break = (function(_super) {
    __extends(Break, _super);

    function Break(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      Break.__super__.constructor.call(this, this.node, this.parent, this.workflow);
    }

    Break.prototype.renderSimpleBlock = function() {
      var d, img, sp, src;

      d = $('<div />').addClass('wfitem wfblock');
      this.highlight_block = d;
      src = imageUrl('break.png');
      img = $('<img />').attr('src', src);
      img.width(25);
      img.css('position', 'absolute');
      img.css({
        left: 4,
        top: 4
      });
      d.append(img);
      sp = $('<span />').text('Break').addClass('text');
      sp.attr('title', 'Break');
      d.append(sp);
      return d;
    };

    return Break;

  })(Item);

  SetVariable = (function(_super) {
    __extends(SetVariable, _super);

    function SetVariable(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      SetVariable.__super__.constructor.call(this, this.node, this.parent, this.workflow);
    }

    SetVariable.prototype.renderSimpleBlock = function() {
      var d, img, sp, src;

      d = $('<div />').addClass('wfitem wfblock');
      this.highlight_block = d;
      src = imageUrl('variable.png');
      img = $('<img />').attr('src', src);
      img.width(25);
      img.css('position', 'absolute');
      img.css({
        left: 4,
        top: 4
      });
      d.append(img);
      sp = $('<span />').text(this.title).addClass('text');
      sp.attr('title', this.title);
      d.append(sp);
      return d;
    };

    return SetVariable;

  })(Item);

  Terminate = (function(_super) {
    __extends(Terminate, _super);

    function Terminate(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      Terminate.__super__.constructor.call(this, this.node, this.parent, this.workflow);
    }

    Terminate.prototype.renderSimpleBlock = function() {
      var d, img, sp, src;

      d = $('<div />').addClass('wfitem wfblock');
      this.highlight_block = d;
      src = imageUrl('terminate.png');
      img = $('<img />').attr('src', src);
      img.width(25);
      img.css('position', 'absolute');
      img.css({
        left: 4,
        top: 4
      });
      d.append(img);
      sp = $('<span />').text('Terminate').addClass('text');
      sp.attr('title', 'Terminate');
      d.append(sp);
      return d;
    };

    return Terminate;

  })(Item);

  Action = (function(_super) {
    __extends(Action, _super);

    function Action(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      Action.__super__.constructor.call(this, this.node, this.parent, this.workflow);
      this.action = this.node.children('Action').text();
    }

    Action.prototype.renderSimpleBlock = function() {
      var d, img, sp, src;

      d = $('<div />').addClass('wfitem wfblock');
      this.highlight_block = d;
      src = imageUrl('command.png');
      img = $('<img />').attr('src', src);
      img.width(25);
      img.css('position', 'absolute');
      img.css({
        left: 4,
        top: 4
      });
      d.append(img);
      sp = $('<span />').text(this.title).addClass('text');
      sp.attr('title', this.title);
      d.append(sp);
      return d;
    };

    return Action;

  })(Item);

  Loop = (function(_super) {
    __extends(Loop, _super);

    function Loop(node, parent, workflow) {
      var actions;

      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      Loop.__super__.constructor.call(this, this.node, this.parent, this.workflow);
      actions = this.node.children('Actions');
      this.action_items = new ItemList(actions, this, this.workflow);
    }

    Loop.prototype.render = function(dv, x, y) {
      var bar_y, hbar1, hbar2, lo, logo, start_y;

      start_y = y + ConnectorHeight * 0.5;
      WorkFlow.addVConnector(dv, this.action_items, {
        'x': x,
        'y': y
      }, {
        'x': x,
        'y': y + ConnectorHeight
      }, this);
      y += ConnectorHeight;
      y = this.action_items.render(dv, x, y);
      WorkFlow.addVConnector(dv, this.action_items, {
        'x': x,
        'y': y
      }, {
        'x': x,
        'y': y + ConnectorHeight
      }, this);
      y += ConnectorHeight;
      logo = $('<div />').addClass('wfbranch_logo wfblock ' + this.type.toLowerCase());
      dv.append(logo);
      logo.centerPos(x, y);
      y += logo.height();
      console.log(this.action_items.width(), this.action_items.centerX(), x);
      lo = x + this.action_items.width() - this.action_items.centerX();
      bar_y = y - logo.height() * 0.5 - 2;
      WorkFlow.addVConnector(dv, this, {
        'x': lo,
        'y': start_y
      }, {
        'x': lo,
        'y': bar_y
      }, this);
      hbar1 = $('<div />').addClass('wfbranch_bar' + ' ' + this.type.toLowerCase());
      hbar1.css('left', x);
      hbar1.width(lo - x);
      hbar1.css('top', bar_y);
      dv.append(hbar1);
      hbar2 = $('<div />').addClass('wfbranch_bar' + ' ' + this.type.toLowerCase());
      hbar2.css('left', x);
      hbar2.width(lo - x);
      hbar2.css('top', start_y);
      dv.append(hbar2);
      return y;
    };

    Loop.prototype.width = function() {
      return this.action_items.width() + 50;
    };

    Loop.prototype.height = function() {
      return this.action_items.height() + ConnectorHeight + logo.height();
    };

    Loop.prototype.centerX = function() {
      return this.action_items.centerX();
    };

    return Loop;

  })(Item);

  Brancher = (function(_super) {
    __extends(Brancher, _super);

    function Brancher(node, parent, workflow) {
      var false_node, n, true_node;

      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      Brancher.__super__.constructor.call(this, this.node, this.parent, this.workflow);
      true_node = this.node.children('True');
      false_node = this.node.children('False');
      this.false_items = new ElseBranch(false_node, this, this.workflow);
      this.true_list = (function() {
        var _i, _len, _ref, _results;

        _ref = true_node.children('Condition');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          n = _ref[_i];
          _results.push(new ConditionalBranch($(n), this, this.workflow));
        }
        return _results;
      }).call(this);
    }

    Brancher.prototype.render = function(dv, x, y) {
      var branch, branch_ends, branch_y, branch_ys, bry, cx, end, ep, false_final_y, false_x, final_item, final_y, hbar1, hbar2, header, i, li, logo, start, true_branch, true_final_y, true_x, true_x_last, tw, _i, _j, _len, _len1, _ref;

      logo = $('<div />').addClass('wfbranch_logo wfblock ' + this.type.toLowerCase());
      dv.append(logo);
      logo.centerPos(x, y);
      y += logo.height();
      header = $('<div />').text(this.title).addClass('wfbranch_header wfblock');
      header.appendTo(dv);
      header.centerPos(x, y);
      this.highlight_block = header;
      i = 1;
      true_x = x;
      branch_y = y + header.height() + 10;
      branch_ys = [];
      true_x_last = x;
      branch_ends = [];
      _ref = this.true_list;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        true_branch = _ref[_i];
        cx = true_branch.centerX();
        tw = true_branch.width();
        true_x = true_x - tw - BranchSpace;
        bry = true_branch.render(dv, true_x + cx, branch_y + 10);
        true_x_last = true_x + cx;
        branch_ys.push(bry);
        branch_ends.push({
          x: true_x + cx,
          y: bry,
          item: true_branch
        });
      }
      true_final_y = _.max(branch_ys) + ConnectorHeight;
      false_x = x + this.false_items.centerX() + BranchSpace;
      false_final_y = this.false_items.render(dv, false_x, branch_y + 10);
      final_item = this.false_items.lastItem();
      final_y = _.max([true_final_y, false_final_y + ConnectorHeight]);
      hbar1 = $('<div />').addClass('wfbranch_bar' + ' ' + this.type.toLowerCase());
      hbar1.css('left', true_x_last - 2);
      hbar1.width(x + this.false_items.centerX() + BranchSpace - true_x_last);
      hbar1.css('top', branch_y);
      dv.append(hbar1);
      hbar2 = $('<div />').addClass('wfbranch_bar' + ' ' + this.type.toLowerCase());
      hbar2.css('left', true_x_last - 2);
      hbar2.width(x + this.false_items.centerX() + BranchSpace - true_x_last + 4);
      hbar2.css('top', final_y);
      dv.append(hbar2);
      if (final_item == null) {
        final_item = this.false_items;
      }
      for (_j = 0, _len1 = branch_ends.length; _j < _len1; _j++) {
        branch = branch_ends[_j];
        start = {
          x: branch.x,
          y: branch.y
        };
        end = {
          x: branch.x,
          y: final_y
        };
        li = branch.item.lastItem();
        if (li == null) {
          li = branch.item;
        }
        WorkFlow.addVConnector(dv, li, start, end, this);
        ep = $('<div />').addClass('wfbranch_endpoint' + ' ' + this.type.toLowerCase());
        ep.width(EndPointWidth);
        ep.height(EndPointHeight);
        dv.append(ep);
        ep.centerPos(branch.x, branch_y - 4);
      }
      WorkFlow.addVConnector(dv, final_item, {
        x: false_x,
        y: false_final_y
      }, {
        x: false_x,
        y: final_y
      }, this);
      ep = $('<div />').addClass('wfbranch_endpoint' + ' ' + this.type.toLowerCase());
      ep.width(EndPointWidth);
      ep.height(EndPointHeight);
      dv.append(ep);
      ep.centerPos(x + this.false_items.centerX() + BranchSpace, branch_y - 4);
      return final_y;
      return final_y + ConnectorHeight;
    };

    Brancher.prototype.width = function() {
      var false_width, i, true_width;

      true_width = _.sum((function() {
        var _i, _len, _ref, _results;

        _ref = this.true_list;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push(i.width() + BranchSpace);
        }
        return _results;
      }).call(this));
      false_width = this.false_items.width() + BranchSpace;
      return true_width + false_width;
    };

    Brancher.prototype.height = function() {
      var branch, false_height, true_height;

      true_height = _.max((function() {
        var _i, _len, _ref, _results;

        _ref = this.true_list;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          branch = _ref[_i];
          _results.push(branch.height());
        }
        return _results;
      }).call(this));
      false_height = this.false_items.height();
      return _.max(true_height, false_height) + ConnectorHeight;
    };

    Brancher.prototype.centerX = function() {
      var i;

      return _.sum((function() {
        var _i, _len, _ref, _results;

        _ref = this.true_list;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push(i.width() + BranchSpace);
        }
        return _results;
      }).call(this));
    };

    return Brancher;

  })(Item);

  ConditionalBranch = (function(_super) {
    __extends(ConditionalBranch, _super);

    function ConditionalBranch(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      ConditionalBranch.__super__.constructor.call(this, this.node, this.parent, this.workflow);
      this.action = this.node.children('Action').text();
      this.action2 = this.node.children('Action2').text();
      this.operator = this.node.children('Operator').text();
    }

    ConditionalBranch.prototype.width = function() {
      if (this.items.length === 0) {
        return ConditionHeaderWidth;
      }
      return Math.max(ConditionalBranch.__super__.width.call(this), ConditionHeaderWidth);
    };

    ConditionalBranch.prototype.centerX = function() {
      var c;

      c = ConditionalBranch.__super__.centerX.call(this);
      return Math.max(c, ConditionHeaderWidth * 0.5);
    };

    ConditionalBranch.prototype.render = function(dv, x, y) {
      var bh;

      y += 3;
      bh = $('<div />').addClass('wfcondition_header  wfblock' + this.parent.type.toLowerCase());
      this.highlight_block = bh;
      bh.text(this.title);
      bh.width(ConditionHeaderWidth);
      bh.height(ConditionHeaderHeight);
      dv.append(bh);
      bh.centerPos(x, y);
      y += ConditionHeaderHeight;
      WorkFlow.addVConnector(dv, this, {
        'x': x,
        'y': y
      }, {
        'x': x,
        'y': y + ConnectorHeight
      }, this.parent);
      y += ConnectorHeight;
      return ConditionalBranch.__super__.render.call(this, dv, x, y);
    };

    ConditionalBranch.prototype.highlight = function() {
      return ConditionalBranch.__super__.highlight.call(this);
    };

    return ConditionalBranch;

  })(ItemList);

  Wait = (function(_super) {
    __extends(Wait, _super);

    function Wait(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      Wait.__super__.constructor.call(this, this.node, this.parent, this.workflow);
      this.condition_frequency = this.node.attr('ConditionFrequency');
    }

    return Wait;

  })(Brancher);

  Decision = (function(_super) {
    __extends(Decision, _super);

    function Decision(node, parent, workflow) {
      this.node = node;
      this.parent = parent;
      this.workflow = workflow;
      Decision.__super__.constructor.call(this, this.node, this.parent, this.workflow);
    }

    return Decision;

  })(Brancher);

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.WorkFlow = WorkFlow;

}).call(this);
