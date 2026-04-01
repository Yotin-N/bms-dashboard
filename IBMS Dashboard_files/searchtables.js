__SearchTables__ = {};
SearchTableCellHeight = 50;
$(function(){
   
    $('.js-pager-prev').live('click',function(event){
        var stid = $(this).closest('.searchtablepager').attr('searchtable');
        if (!stid) return;
        event.stopPropagation();
        event.preventDefault();
        __SearchTables__[stid].loadPrev();
    });
    
    $('.js-pager-next').live('click',function(event){
        var stid = $(this).closest('.searchtablepager').attr('searchtable');
        if (!stid) return;
        event.stopPropagation();
        event.preventDefault();
        __SearchTables__[stid].loadNext();
    });
});
var SearchTable = function(id,opts) {
    var self = this;

    self.opts = opts;
    self.id = id;

};
SearchTable.load = function(id,cb) {
    __SearchTables__[id].load(cb);
};
SearchTable.init = function(id) {
    __SearchTables__[id].init();
};
SearchTable.startBrowsing = function(id,ctrl) {
    __SearchTables__[id].startBrowsing(ctrl);
}
SearchTable.loadNext = function(id) {
    __SearchTables__[id].loadNext();
}
SearchTable.loadPrev = function(id) {
    __SearchTables__[id].loadPrev();
}
SearchTable.toggleMode = function(id,mode) {
    __SearchTables__[id].toggleMode(mode);
}
SearchTable.prototype.getFieldID = function(parameter) {
    var self = this;
    if (!!parameter.field) return parameter.field;
    var xf = parameter.xfield;
    if (!xf) return '';
    var xs = self.opts.xscope;
    return $X(xs,xf);
}
SearchTable.prototype.registerFieldChanges = function() {
    var self = this;

    var params = self.opts.parameters;
    var load_table = _.debounce(function(){self.load();},400);

    self.field_changes_registered = true;
    for(var i=0;i<params.length;i++) {
        var parameter = params[i];
        var f = self.getFieldID(parameter);
        var ab = parameter.auto_bind;
        if (ab!="0") {
            ServiceDesk.registerFieldChange(f,function(){
                    load_table();
                    });
        }
    }
}
SearchTable.prototype.init = function() {
    var self = this;

    $(document).ready(function(){
        self.registerFieldChanges();
        if (self.opts.fixedheight=='true') {
            var content = $$(self.id + '__results');
            var h = xint(self.opts.max)*SearchTableCellHeight;
            console.log('fooey',h,self.opts);
            if (h>0) content.css('height',h+10);
        }
    });
};
SearchTable.prototype.highlightRows = function(cond) {
    var self = this;
    var id = self.id;
    var content = $$(id + "__results");

    content.find('div.sd-table-metadata').each(function(){
        if (cond(ServiceDesk.parseJSONObject($(this).text()))) {
            $(this).parents('.fe_row').addClass('tohighlight');
        }
    });
    ServiceDesk.runPendingHighlights();
}
SearchTable.prototype.eachItem = function(cb) {
    var self = this;
    var id = self.id;
    var content = $$(id + "__results");

    content.find('div.sd-table-metadata').each(function(){
        cb(ServiceDesk.parseJSONObject($(this).text()));
    });
}
SearchTable.prototype.switchMode = function(mode) {
    var self = this;
    self.mode= mode;
    self.reloadCurrent();
}
SearchTable.prototype.toggleMode = function(_mode) {
    var self = this;
    var switches = $$(self.id).find('.switch_segment');
    var found = false;
    switches.each(function(){
        var mode = $(this).attr('mode');
        if (mode.toUpperCase() == _mode.toUpperCase() ) {
            $(this).addClass('switch_selected');
            found = true;
        } else {
            $(this).removeClass('switch_selected');
        }
        /*
        var img = $(this).find('img');
        var mode = $(this).attr('mode');
        var src = ServiceDesk.rootUrl('images/switch-off.png');
        if (mode.toUpperCase() == _mode.toUpperCase() ) {
            found = true;
            src = ServiceDesk.rootUrl('images/switch-on.png');
        }
        $(this).find('img').attr('src',src);
        */
    });
    if (found)
        self.switchMode(_mode);
};
SearchTable.prototype.loadMore = function(done) {
    var self = this;
    var id = self.id;
    var opts = self.opts;

    var ctrl = $$(id);
    var content = $$(id+"__results");
    var footer = $$(id+"__footer");
    var loader = $$(id).children('.loader');

    var last = xnum(self.opts.last);

    var view = xstr(self.opts.view);
    if (view=="") return;

    var max = xstr(self.opts.max);
    var parameters = {};
    ServiceDesk.fillRemoteCallParams(parameters);
    parameters.max = max;
    parameters.last = last;
    // if (!!self.opts.xbase)  {

    //     parameters['__xbase__'] = self.opts.xbase;

    // } else 
    if (!!self.opts.rawid && !!self.opts.xscope) {

        parameters['__ui_st_scope_' + self.opts.rawid + '__'] = self.opts.xscope;
    }
    if (!!self.mode) parameters.__mode__ = self.mode;
    for(var i=0;i<self.opts.parameters.length;i++) {
        var parameter = self.opts.parameters[i];
        var f = self.getFieldID(parameter);
        var n = parameter.name;
        var v = parameter.value;
        if (!!f && !!n) {
            /*var v = ServiceDesk.getFieldValue(f);
            parameters[n] = xstr(v);*/
            ServiceDesk.gatherFieldValues(f,n,parameters);
        }
        if (!!n && !!v) {
            parameters[n] = v;
        }
    }

    loader.addClass('loading');
    parameters['__ajax__'] = '1';
    content.load(view,parameters,function(resp,status,xhr){
        loader.removeClass('loading');
        if (ServiceDesk.isMobile())content.trigger('create');
        if (status=='error') {
            $(content).html('Error: ' + resp);
            //alert("Error:" + xhr.status+":"+xhr.statusText);
        } else {
            var new_last = 0;
            var count = 0;
            content.find('div.sd-table-metadata').each(function(){
                var obj = ServiceDesk.parseJSONObject($(this).text());
                var xl = xnum(obj.__rowid__);
                if (xl > new_last) new_last = xl;
                count++;
                });
            self.opts.prev_last = last;
            self.opts.last = new_last;
            self.opts.result_count = count;
            if (!!done) done();
            if (!!self.opts.callback) self.opts.callback();
            self.cleanUp();
        }
    });
};
SearchTable.prototype.cleanUp = function() {
    var self = this;
    var id = self.id;
    var opts = self.opts;

    var footer = $$(id+'__footer');
    var result_count = opts.result_count || 0;

    if (result_count==0 && opts.page_stack.length==0) {
        makeInvisible(footer);
    } else {
        makeVisible(footer);
    }

    if (opts.page_stack.length!=0) {
        $$(id+"__prev").removeClass("disabled");
    } else {
        $$(id+"__prev").addClass("disabled");
    }

    if (opts.result_count >= xnum(opts.max)) {
        $$(id+"__next").removeClass("disabled");
    } else {
        $$(id+"__next").addClass("disabled");
    }

    if (opts.page_stack.length==0 && opts.result_count < xnum(opts.max) )
        makeInvisible(footer);
};
SearchTable.prototype.load = function(cb) {
    var self = this;
    var id = self.id;
    var opts = self.opts;
    opts.last = 0;
    opts.page_stack = [];
    self.loadMore(cb);
};
SearchTable.prototype.appendMore = function(cb) {
    var self = this;
    var opts = self.opts;
    if (opts.result_count < xnum(opts.max)) {
        if (!!cb) cb(false);
        return;
    }

    var last = opts.prev_last || 0;
    //TODO
}
SearchTable.prototype.loadNext = function(cb) {
    var self = this;
    var opts = self.opts;
    if (opts.result_count < xnum(opts.max)) {
        if (!!cb) cb(false);
        return;
    }

    var last = opts.prev_last || 0;
    self.loadMore(function(){
            opts.page_stack.push(last);
            if (!!cb) cb(true);
            });
};
SearchTable.prototype.updateField =  function(opts) {
    var self = this;
    var opts = opts || {};
    self.reloadCurrent(opts.done);
};

SearchTable.prototype.reloadCurrent =  function(cb) {
    var self = this;
    var opts = self.opts;
    opts.last = opts.prev_last||0;
    self.loadMore(cb);
};
SearchTable.prototype.loadPrev =  function(cb) {
    var self = this;
    var opts = self.opts;

    if (opts.page_stack.length==0) {
        if (!!cb) cb(false);
        return;
    }
    var last = opts.page_stack.pop();
    if (!last) last=0;
    opts.last = last;
    self.loadMore(function(){
        if (!!cb) cb(true);
    });
};
SearchTable.prototype.setCallback = function(func) {
    var self = this;
    self.opts.callback = func;
};
SearchTable.prototype.getAllKeys = function() {
    var self = this;
    var opts = self.opts;
    var id = self.id;

    var content = $$(id+"__results");
    var items = [];
    self.eachItem(function(obj) {
        var xl = obj.__key__;
        items.push(xl);
    });
    return items;
};
SearchTable.prototype.loadCurrentBrowserContent = function(animate_dir,done) {
    var self = this;
    var keys = self.browseKeys || [];
    var key = self.browsePos || 0;
    var bc = self.getBrowserControls();

    var app = parseAppUri(self.opts.browseview);
    if (!app) {
        console.log('No valid browse uri found');
        return;
    }

    animate_dir = xint(animate_dir,0);

    if (!keys || key >= keys.length) {
        var msg = 'No data available';
        if (key >= keys.length) msg = 'No more data available';
        bc.content.html('').append($('<div />').html(msg).addClass('nodata nodatabrowse'));
        if (!!done) done();
        return;
    }

    var data = keys[key];

    if (!bc.content || !bc.content.length) return;

    if (!!self.browseRequest && !!self.browseRequest.abort) self.browseRequest.abort();

    bc.content.addClass('loading');

    var target;
    if (!self.browserPane || self.browserPane[0] == bc.pane2[0])
        target = bc.pane1;
    else
        target = bc.pane2;
    var w = bc.content.width();
    target.css({marginLeft:w*animate_dir}).width(w);
    $('.content',target).html('');

    var animator = function() {
        if (animate_dir != 0)
            target.animate({marginLeft:0});
        
        if (!!self.browserPane) {
            if (animate_dir==0)
                self.browserPane.css({marginLeft:-w});
            else
                self.browserPane.animate({marginLeft:-w*animate_dir});
        }
        self.browserPane = target;
        
    }

    $('.page_loading').makeVisible();
    /*
    setTimeout(
    function(){
    */
        
    self.browseRequest = ServiceDesk.insertView($('.content',target),app.app,app.view,{'key':data},function(){
        bc.content.removeClass('loading');
        animator();
        $('.page_loading').makeInvisible();
        if (!!done) done();
    },function(st,txt) {
        animator();
        bc.content.removeClass('loading');
        alert(st+":"+txt);
        $('.page_loading').makeInvisible();
        if (!!done) done();
    });


/*
    }
    ,1000);
    */


    //animator();
    
};
SearchTable.prototype.getBrowserControls = function() {
    var self = this;
    var id = self.id;
    var pager = $$(id+'__browserpager');
    return {
        'pager': pager
        ,'prev': $(pager).find('.browser_prev')
        ,'next': $(pager).find('.browser_next')
        ,'content': $(pager).find('.browser_content')
        ,'pane1': $(pager).find('.browser_content .pane1')
        ,'pane2': $(pager).find('.browser_content .pane2')
    };
};
SearchTable.prototype.browseNext = function() {
    var self = this;
    var opts = self.opts;
    var k = self.browsePos;
    var keys = self.browseKeys;
    if (!keys) return;
    if (k < keys.length-1) {
        self.browsePos += 1;
        self.loadCurrentBrowserContent(1);
        return;
    } else {
        self.loadNext(function(ok){
                if (!ok) return;
                self.browseKeys = self.getAllKeys();
                self.browsePos = 0;
                self.loadCurrentBrowserContent(1);
        });
    }
};
SearchTable.prototype.browsePrev = function() {
    var self = this;
    var opts = self.opts;

    var k = self.browsePos;
    var keys = self.browseKeys;
    if (!keys) return;
    if (k > 0) {
        self.browsePos -= 1;
        self.loadCurrentBrowserContent(-1);
        return;
    } else {
        self.loadPrev(function(ok){
                if (!ok) return;
                self.browseKeys = self.getAllKeys();
                self.browsePos = self.browseKeys.length-1;
                self.loadCurrentBrowserContent(-1);
        });
    }
};
SearchTable.createNavigationLink = function(direction,txt,func) {/*'next' or 'prev' */
    var x = 'left';
    if (direction == 'next') x = 'right';
    var sp = $('<span />').addClass('pager_' + x).click(function(evnt){
        evnt.preventDefault();
        evnt.stopPropagation();
        func();
    });
    var tip = $('<span />').addClass('tip').html('&nbsp;');
    if (x == 'left')
        sp.append(tip);
    var b = $('<span />').addClass('body');
    if (x=='left') b.css('margin-left','0px');
    else b.css('margin-right','0px');
    var a = $('<a />').addClass('paging_navigation').css('top','2px').text(txt).attr('href','#').click(function(evnt){
        evnt.preventDefault();
        evnt.stopPropagation();
        func();
    });
    a.appendTo(b);
    b.appendTo(sp);

    if (x != 'left')
        sp.append(tip);
    return sp;
};
SearchTable.prototype.startBrowsing = function(_ctrl,key) {
    var self = this;
    var opts = self.opts;
    var id = self.id;

    var link = $$(id+'__browse');
    if ($(_ctrl).exists()) link = $(_ctrl);

    SearchTable.loadBrowseContentInPopup(link,function(ctrl,rendered) {
            var pager_id = id + "__browserpager";
            if (!$$(pager_id).length) {
                var el = $('<div />').attr('id',pager_id);
                el.addClass('browser_pager');
                var pager_bar = $('<div />').attr('id',pager_id+"__browsebar").addClass('browsebar');
                var navigation_area = $('<div />').addClass('pager_links').appendTo(pager_bar);
                $('<div />').addClass('loading_small invisible page_loading').appendTo(navigation_area).css({
                    'display':'inline-block'
                    ,'position':'relative'
                    ,'top':'4px'
                    ,'padding-right':'10px'
                });
                SearchTable.createNavigationLink('prev','Prev',function(){self.browsePrev();}).appendTo(navigation_area).css('margin-right','5px');
                SearchTable.createNavigationLink('next','Next',function(){self.browseNext();}).appendTo(navigation_area);
                var content = $('<div />').addClass('browser_content').css({ position: 'relative' });
                content.append($('<div />').addClass('pane1 pane').css({'position':'absolute'}) );
                content.append($('<div />').addClass('pane2 pane').css({'position':'absolute'}) );
                $('.pane1',content).append($('<div />').addClass('content').css('margin','0px'));
                $('.pane2',content).append($('<div />').addClass('content').css('margin','0px'));
                el.append(content);

                el.append(pager_bar);
                ctrl.append(el);

                content.parents('.modal_container').css('overflow','hidden');
                content.parents('.modal_container').keydown(function(event){
                    if (event.which==39) {
                        self.browseNext();
                        event.preventDefault();
                        return;
                    }
                    if (event.which==37) {
                        self.browsePrev();
                        event.preventDefault();
                        return;
                    }
                });
            } else {
                var _pid = $$(pager_id);
                _pid.appendTo(ctrl);
            }
            var keys = self.getAllKeys();
            var current_keys = self.browseKeys || [];
            if (!!current_keys && (keys.join(',')==current_keys.join(','))) {
                //We're on the same page. So don't reset anything
            } else {
                self.browseKeys = keys;
                self.browsePos = 0;
            }

            if (key!=null && (typeof key != 'undefined')) {
                var ki = keys.indexOf(key);
                if (ki>=0) self.browsePos = ki;
            }
            var f = function(){if (!!rendered) rendered(ctrl.find('.browsebar'));};
            self.loadCurrentBrowserContent(0,f);
            //if (!!rendered) rendered(ctrl.find('.browsebar'));
    },id);
};
SearchTable.getTableByPrefix = function(id) {
    var results = [];
    _.forEach(__SearchTables__,function(v,k) {
        if (_.startsWith(k,id))
            results.push(v);
    });
    return results[0]|| null;
}
SearchTable.loadBrowseContentInPopup = function(control,content_generator,seed_id) {
    if ($(control).closest('.modal').exists()) {
        var container = $(control).closest('.modal_container');
        var p = container.parent();
        p.css('overflow','hidden');
        /*we're already in a popup */
        var d = $('<div />').addClass('browse_container');

        var dc = $('<div />').addClass('content');
        dc.appendTo(d);
        d.insertAfter(container);
        d.makeInvisible();
        d.height(container.height());
        d.width(container.width());
        d.css('marginTop',container.height());
        d.makeVisible();
        d.addClass('loading');
        d.animate({marginTop:'0px'},function(){
            content_generator(d.find('.content'),function(pager_bar){
                d.removeClass('loading');
                var bar = pager_bar;
                if (bar.exists()) {
                    var f= bar.find('.back_link');
                    if (!f.exists()) {
                        var link = SearchTable.createNavigationLink('prev','Back',function(){
                            var _bc = p.find('.browse_container');
                            _bc.animate({marginTop:5+container.height()},function(){
                                _bc.makeInvisible();
                            });
                        });
                        f = $('<span />').addClass('back_link').append(link);
                        f.appendTo(bar);
                        /*
                        f.click(function(evnt) {
                            evnt.stopPropagation();
                            evnt.preventDefault();
                        });
                        */
                    }
                    
                }
            });
        });
        return;
    }
    ServiceDesk.loadContentInPopup(control,content_generator,seed_id);
}
SearchTable.getMetaData = function(ctrl) {
    var md = $(ctrl).parents('.metadata_container').find('div.sd-table-metadata');
    if (!$(md).exists()) {
        return null;
    }
    //TODO: changed from .html() to .text() Correct?
    var obj = ServiceDesk.parseJSONObject($(md).text());
    return obj;
};
SearchTable.getCurrentSearchTable = function(ctrl) {
    var id = $(ctrl).parents('.searchtable').attr('id');
    if (!id) return null;
    return __SearchTables__[id];
};
/*
SearchTable.clickPager = function(sp) {
    var a = $(sp).find('a.paging_navigation');
    //TODO: fix this crap
    _.defer(function(){a.click();});
}
*/
