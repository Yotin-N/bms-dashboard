var __TabControls__ = {};
var TabControl = function() {
    this.id = arguments[0];
    this.selectedTab = -1;
    this.tabs = [];
    this.tab_widths = null;
    for(var i=1;i<arguments.length;i++) {
        this.tabs.push(arguments[i]);
    }
    var self = this;
    /* This is to adjust tabs properly for popups */
    _.defer(function(){
        self.adjustTabs();
    });
};
TabControl.prototype.adjustTabs = function() {
    var self = this;
    var container = $$(self.id);
    var tab_width = container.width()  - container.find('.utilstrip').width();

    var tabs = container.find('.tab');
    $(tabs).addClass('last').addClass('extra');

    var max = tabs.length;

    /* Seed it with 20 for the arrow at the end of the last tab */
    var cw = 20;

    var max_tab_width = 0;
    if (self.tab_widths==null) {

    }
    if (self.tab_widths==null) {
        self.tab_widths = [];
        for(var i=tabs.length-1;i>=0;i--) {
            var w = $(tabs[i]).width();
            if (w > max_tab_width) {
                max_tab_width = w;
            }
            self.tab_widths.push(max_tab_width);
        }
        self.tab_widths.reverse();
    }

    for(var i=0;i<tabs.length;i++) {
        var w = $(tabs[i]).width();
        var widest_tab = self.tab_widths[i];
        if (cw + widest_tab > tab_width) {
            max = i;
            break;
        }
        cw += w;
    }

    if (max < 1) max = 1;

    $(tabs).removeClass('last').removeClass('extra');

    var last_tab = null;
    var visible_tab = null;
    for (var i = 0; i < tabs.length; i++) {
        var tab = $(tabs[i]);
        var last_visible_tab = max>tabs.length?tabs.length-1:max-1;

        if ((i == last_visible_tab) && (last_visible_tab < tabs.length-1)) {
            tab.addClass('extra last');
            last_tab = tab;
        }
        
        if (i > last_visible_tab) {
            tab.addClass('extra');
            if (tab.hasClass('visible')) visible_tab = tab;
        }
        
    };
    if (!!visible_tab && !!last_tab) {
        last_tab.removeClass('last');
        visible_tab.addClass('last');
    }
    container.find('.tabmenu').remove();
};
TabControl.prototype.selectTabMenu = function(hr,i) {
    var self = this;
    var container = $$(self.id);
    var tab = self.getTabHeader(i);
    if (!(tab.hasClass('extra'))) {
        self.selectTab(i);
        return;
    }
    _.defer(function(){
        var container = $$(self.id);
        var extra_tabs = container.find('.tab.extra');
        var menu = $(container).find('.tabmenu');
        if (!menu.exists()) {
            menu = $('<ul />').addClass('popupmenu bubble tabmenu');
            for(var i=0;i<extra_tabs.length;i++) (function(i){
                var text = $(extra_tabs[i]).find('.tabtitle').text();
                var li = $('<li />').text(text)
                    .attr('data-tabindex',$(extra_tabs[i]).attr('data-tabindex'))
                    .attr('data-tabid',$(extra_tabs[i]).attr('data-tabid'))
                ;
                li.touchClick(function(evnt){
                    var tab_index = xint($(extra_tabs[i]).attr('data-tabindex'));
                    console.log(tab_index);
                    self.selectTab(tab_index);
                    ServiceDesk.hideBubbles();
                });
                menu.append(li);
            })(i);
            container.append(menu);
        }
        menu.find('li').removeClass('selected');
        menu.find('li[data-tabindex="'+$(hr).attr('data-tabindex')+'"]').addClass('selected');
        $(hr).showMenu(menu);
        return;
        // var pos = $(hr).offset();
        // menu.css({
        //     'position':'absolute'
        //     ,'visibility':'visible'
        // });
        // menu.offset({
        //     left: pos.left
        //     ,top: pos.top + $(hr).outerHeight()
        // });
    });
};
TabControl.prototype.selectTabById = function(id) {
    if (!id) return;
    for(var j=0;j<this.tabs.length;j++) {
        var ctrl = this.getTabHeader(j);
        var tabId = $(ctrl).attr('data-tabid');
        if (tabId == id) {
            this.selectTab(j);
            return;
        }
    }
}
TabControl.prototype.selectTab = function(i) {
    if (i < 0 || i > this.tabs.length) return;
    for(var j=0;j<this.tabs.length;j++) {
        var ctrl = this.tabs[j];
        if (j==i) {
            $$(ctrl).removeClass('tabcollapsed');
            this.selectedTab = i;
            $$(ctrl).find('.ontabselected').trigger('tabselected')
        }
        else {
            $$(ctrl).addClass('tabcollapsed');
        }
    }
    var q = $('#' + this.id + ' .tab');
    q.removeClass('tab_selected').addClass('tab_not_selected');


    if (this.selectedTab >=0 && this.selectedTab < this.tabs.length) {
        var tab = $(q[this.selectedTab]);
        tab.removeClass('tab_not_selected').addClass('tab_selected');
        if (tab.hasClass('extra')) {
            q.removeClass('visible');
            q.removeClass('last');
            tab.addClass('last');
        }
        tab.addClass('visible');
    }
    $$(this.id).trigger('ontabchanged',[this.selectedTab]);
    var r= ServiceDesk.urlFragment();
    r['tabs.' + this.id] = i;
    ServiceDesk.setUrlFragment(r);

    // hash = '#!tabs.' + this.id + '.' + i;
    // if (!!history && !!history.replaceState)
    //     history.replaceState(null,null,hash);

};
TabControl.prototype.getTabHeader = function(index) {
    var x = $('#' + this.id+"__header" + index);
    return $(x);
};
TabControl.prototype.onTabChanged = function(func) {
    $$(this.id).bind('ontabchanged',func);
};
TabControl.loadFromHash = function() {
    var fragment = ServiceDesk.urlFragment();
    _.each(fragment,function(value,key){
        if (_.startsWith(key,'tabs.')) {
            var tab_id = key.substring(5);
            value = xnum(value);
            if (!!__TabControls__[tab_id]) {
                TabControl.setTab(tab_id,value);
            }
            return;
        }
        if (_.startsWith(key,'tabid.')) {
            var tab_id = key.substring('tabid.'.length);
            if (!!__TabControls__[tab_id]) {
                TabControl.setTabById(tab_id,value);
            }
            return;
        }
    });
    return;
    // if (!fragment) fragment = location.hash.substring(1);
    // if (!_.startsWith(fragment,'!tabs.')) return;
    // var parts = fragment.substring("!tabs.".length).split('.');
    // if (parts.length != 2) return;
    // var tab_id = parts[0];
    // var tab = xint(parts[1]);
    // if (__TabControls__[tab_id])
    //     TabControl.setTab(tab_id,tab);
};

TabControl.setTab = function (id,index) {
    __TabControls__[id].selectTab(index);
};
TabControl.setTabById = function (id,index) {
    __TabControls__[id].selectTabById(index);
};
TabControl.flagAsError = function(id,index) {
    __TabControls__[id].getTabHeader(index).addClass('tab-error');
};
TabControl.selectTabMenu = function(hr,id,index) {
    __TabControls__[id].selectTabMenu(hr,index);
}
ServiceDesk.onLoad(function(){
    TabControl.loadFromHash();
    var adjust_tabs = function() {
        _.each(__TabControls__,function(ctrl,id) {
            ctrl.adjustTabs();
        });
    };
    var adjust_tabs_throttled = _.throttle(adjust_tabs,500,{leading:false});
    $(window).resize(function(){
        adjust_tabs_throttled();
    });
    adjust_tabs();
});
