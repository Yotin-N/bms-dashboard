var MultiListField = function(id,opts) {
    var self = this;
    self.opts = opts;
    self.optmap = {};
    self.loadValues(self.opts.items);
    self.id = id;
    var ctrl = $$(self.id);
    ctrl.touchClick(function(evnt){
        evnt.stopPropagation();
        evnt.preventDefault();
        var dv = ctrl.find('.results');
        if (!dv.exists()) {
            dv = $('<div />').addClass('ml-bubble results bubble');
            ctrl.append(dv);
        }
        dv.empty();
        var values = self.getValue().split(',');
        _.each(self.opts.items,function(item){
            var x = $('<div class="item" />');
            x.attr('key',item.key);
            var cb = $('<span class="checked v3icon-checkmark checkbox" />');
            if (_.indexOf(values,item.key)>=0) {
                // cb.attr('checked','checked');
            } else {
                cb.removeClass('v3icon-checkmark')
                .removeClass('checked');
                ;

            }
            var sp = $('<span />').text(item.value);
            x.append(cb).append(sp);
            x.touchClick(function(evnt){
                evnt.preventDefault();
                if (cb.hasClass('checked')) {
                    cb.removeClass('checked');
                    self.removeValue(item.key);
                } else {
                    cb.addClass('checked');
                    self.addValue(item.key);
                }
            });
            dv.append(x);
            self.renderItem(x);
        });
        $('.ml-bubble').css('visibility','hidden');
        // ServiceDesk.hideBubbles();
        _.defer(function(){
            dv.css('visibility','visible');
        });
    });
    self.updateLabel();
};

MultiListField.prototype.gatherPostFields = function(p) {
    var self = this;
    var n = self.id;
    p[n + "_hdn"] = self.getValue();
    p[n] = self.getValue();
};
MultiListField.prototype.renderItem = function(item) {
    var self = this;
    $(self).trigger('render-item',[item])
};
MultiListField.prototype.onRenderItem = function(func) {
    var self = this;
    $(self).bind('render-item',func);
};
/*
*/
MultiListField.prototype.loadValues = function(items,_opts) {
    var self = this;
    _opts = _opts || {};
    var key_field = _opts.key_field || self.opts.key_field;
    var text_field = _opts.text_field || self.opts.text_field;

    self.optmap = {};
    _.each(items,function(item){

        if (!item.key) item.key = item[key_field];
        if (!item.value) item.value = item[text_field];

        self.optmap[xstr(item.key)] = item.value;
    });
    self.opts.items = items;
    if (!!_opts.clear) {
        self.setValue('');
    }
};
MultiListField.prototype.registerChangeEvent = function(func) {
    var self = this;
    $$(self.id).rebind('valuechanged',func);
};
MultiListField.prototype.triggerChangeEvent = function() {
    var self = this;
    $$(self.id).trigger('valuechanged');
}
MultiListField.prototype.getValue = function() {
    var self = this;
    return xstr($$(self.id).find('.hdnval').val());
};
MultiListField.prototype.clear = function() {
    this.setValue('');
};
MultiListField.prototype.setValue = function(v) {
    var self = this;
    var items = _.filter(v.split(','),function(x){return !!x;});
    var nv = '';
    if (items.length>0) nv = items.join(',');
    $$(self.id).find('.hdnval').val(nv);
    self.updateLabel();
    self.triggerChangeEvent();
};
MultiListField.prototype.removeValue = function(v) {
    var self = this;
    var vals = this.getValue().split(',');
    this.setValue(_.filter(vals,function(x){return !String.matches(v,x);}).join(','));
};
MultiListField.prototype.addValue = function(v) {
    var self = this;
    var value = self.getValue().split(',');
    value.push(xstr(v));
    self.setValue(_.unique(value).join(','));
};
MultiListField.prototype.updateLabel = function() {
    var self = this;
    var ctrl = $$(self.id);
    var tl = ctrl.find('.textlabel');
    var items = [];
    var vals = self.getValue();
    var selected_keys = _.intersection(_.map(self.opts.items,function(x){return x.key;}),vals.split(','));
    var selected_values = _.map(selected_keys,function(key){return self.optmap[key];});
    if (selected_values.length==0)
        tl.text(self.opts.unselected_text);
    else
        tl.text(selected_values.join(','));
}
var DynamicListExField = function(id,app,service,key_field,text_field,type_field,max_rows) {
    var self = this;

    self.id = id;
    self.$hidden = $$(self.id+"__data");
    self.hdn_ot = $$(id + "__objecttype");
    self.editor = $$(self.id);
    self.app = app;
    self.service = service;
    self.key_field = key_field;
    self.text_field = text_field;
    
    if (!self.text_field)
        self.text_field = 'ObjectID';

    self.type_field = type_field;
    self.max_rows = max_rows;
    self.hr = self.editor.parents('.dynlist').find('.dynlistsearch');
    self.result_items = [];

    self._more = null; //element holding 'more' for scroll list


    $(self).data('selectedKey',self.$hidden.val());
    $(self).data('selectedText',$$(self.id).val());

    var KEY = {
        UP: 38,
        DOWN: 40,
        DEL: 46,
        TAB: 9,
        RETURN: 13,
        ESC: 27,
        COMMA: 188,
        PAGEUP: 33,
        PAGEDOWN: 34,
        BACKSPACE: 8
    };
    self.editor.rebind('keydown',function(evnt){
        switch(evnt.keyCode) {
            default: return;
            case KEY.UP:
                self.selectItemByOffset(-1);
                break;
            case KEY.DOWN:
                self.selectItemByOffset(1);
                break;
            case KEY.ESC:
                self.hideResults();
                break;
            // case KEY.TAB:
            //     if (evnt.shiftKey) return;

            case KEY.RETURN:
                self.selectItemByOffset(0);
                self.selectCurrentItem();
                break;
        }
        evnt.stopPropagation();
        evnt.preventDefault();
        
    });
    var updater = _.debounce(function(){self.updateResults();},300);
    self.editor.rebind('keyup',function(evnt){
        switch(evnt.keyCode) {
            default:
                updater();
                break;
            case KEY.UP:
            case KEY.DOWN:
                break;
        }
    });
    self.editor
    .blur(function(){
        self.hideResults();
        self.editFieldExit();

    })
    .focus(function(){
        if (self.isReadonly()) return;
        _.delay(function(){self.editor.select();self.updateResults();self.showResults();});
    });

    self.hr.touchClick(function(evnt){
        evnt.preventDefault();
        self.searchForItem();
    });

    $(document).rebind('itemSelectedFromTable',function(evnt,id,data,ctrl){
        if (id != self.id) return;
        if (!!self.type_field && !data[self.type_field]) {
            var ot = $(ctrl).parents('.sl_modal_container').attr('sl_ot');
            data[self.type_field] = ot;

        }
        self.setItem(data);
        ServiceDesk.closeAllPopups();
    });
};
DynamicListExField.prototype.isReadonly = function() {
    return $$(this.id).parents('.dynlist').hasClass('readonly');
}

DynamicListExField.prototype.initLocationSelector = function() {
    var self = this;
    if (!!self.locationSearchService) {
        $(self.editor).parent().find('.location-search').touchClick(function(evnt){
            evnt.preventDefault();
            if (!self.locationSelector) {
                self.locationSelector = new LocationSelector();
                self.locationSelector.onSelect(function(loc){
                    if (!loc || !loc.LocationKey) {
                        alert('Invalid location');
                        return false;
                    }
                    var p = {};
                    p[self.text_field] = loc.FullName;
                    p[self.key_field] = loc.LocationKey;
                    self.setItem(p);
                    return true;
                });
            }
            self.locationSelector.browseService = self.locationSearchService;
            self.locationSelector.currentKey = self.getValue();
            self.locationSelector.extraParams = self.getExtraParameters();
            self.locationSelector.render();
        });
    }
};
DynamicListExField.prototype.firstObjectType = function() {
    var self = this;
    var otlist = self.allowedObjectTypes.splitProper(',');
    if (otlist.length==0) return null;
    return otlist[0];
};
DynamicListExField.prototype.objectType = function(ot) {
    var self = this;
    if (!!ot) 
        self.hdn_ot.val(ot);
    
    return self.hdn_ot.val();
};
DynamicListExField.prototype.isValidObjectType = function(ot) {
    var self = this;
    if (self.allowedObjectTypes=="") return true;
    var otlist = self.allowedObjectTypes.toUpperCase().splitProper(',');
    return _.indexOf(otlist,ot.toUpperCase()) >= 0;
};
DynamicListExField.prototype.gatherPostFields = function(p) {
    var self = this;
    var obj = self.getObject();
    if (!obj) obj = {ObjectKey:'',ObjectID:'',ObjectType:''};
    // if (!obj) return;
    var n = self.id;
    p[n + "__data"] = obj.ObjectKey;
    p[n + "__text"] = obj.ObjectID;
    p[n] = obj.ObjectID;
    p[n + "__objecttype"] = obj.ObjectType;
};
DynamicListExField.prototype.gatherFields = function(p,n) {
    var self = this;
    var obj = self.getObject();
    // if (!obj) return;
    if (!obj) obj = {ObjectKey:'',ObjectID:'',ObjectType:''};
    p[n] = obj.ObjectKey;
    p[n + "__text"] = obj.ObjectID;
    p[n + "__objecttype"] = obj.ObjectType;
};
DynamicListExField.prototype.editFieldExit = function() {
    var self = this;
    var editor = self.editor;

    if (!editor.val() && !!self.allow_empty) {
        self.forceClearItem();
    } else {
        editor.val(editor.attr('currenttext'));
    }
};
DynamicListExField.prototype.keepResults = function() {
    if (!!this.timeout) clearTimeout(this.timeout);
};
DynamicListExField.prototype.results = function() {
    var self = this;

    function target(event) {
        var element = $(event.target);
        if (element.hasClass('item')) return element;
        return $(element).parents('.item');
        while(element && element.tagName != "DIV")
            element = element.parentNode;
        // more fun with IE, sometimes event.target is empty, just ignore it then
        if(!element)
            return [];
        return element;
    }

    if (!self._results) {
        self._results = $('<div />').attr('id',self.id+"__results").addClass('dynlist_results scrollable');
        self._results.setupCustomScrolling();
        self._results.css('visibility','hidden');
         // var op = self.editor.offsetParent();
        var op = $$(self.id + "__container").find('.dynlist-edit');
        $('body').append(self._results);
        var pos = op.offset();
        pos.top += op.outerHeight(true);
        self._results.css({'left':pos.left,'top':pos.top});
        // op.append(self._results);
        self._results.scroll(function() {
            self.keepResults();
        });
        self._results.mouseover(function(evnt){
            var t = target(evnt);
            if (!t.exists()) return;
            self.selectItem(t);
        });
        self._results.touchClick(function(evnt){
            evnt.stopPropagation();
            evnt.preventDefault();
            //TODO: changed for selenium. Does it work!?
            var t = target(evnt);
            if (!t.exists()) return;
            self.selectItem(t);
            self.selectCurrentItem();
        });
        self._results.on('scroll',function(evnt){
            self.checkForEndOfList();
        });
        /*
        self._results.mousedown(function(evnt) {
            var t = target(evnt);
            if (!t.exists()) return;
            self.selectItem(t);
            self.selectCurrentItem();
        });
*/
    }
    return self._results;
};
DynamicListExField.prototype.checkForEndOfList = function (){
    var self = this;
    var more = self._more;
    if (!more) return;
    if (DynamicListExField.isControlVisible(more)) {
        var r = $(self._more);
        self._more= null;
        var last = r.attr('last');
        self.updateResults(last);
        r.startLoadingAnimation();
        return;
    }
};
DynamicListExField.prototype.showResults = function (){
    var self = this;
    var t = self.timeout;
    if (!!t) clearTimeout(t);
    self.results().css('visibility','visible');
};
DynamicListExField.prototype.hideResults = function() {
    var self = this;
    var t= self.timeout;
    if (!!t) clearTimeout(t);
    self.timeout = setTimeout(function(){self.hideResultsNow();},200);
};
DynamicListExField.prototype.hideResultsNow = function() {
    var self = this;
    self.results().css('visibility','hidden');
    // self.editor.makeInvisible();
    // self.label.makeVisible();
};
DynamicListExField.prototype.edit = function() {
    var self = this;
    // self.label.makeInvisible();
    // self.editor.makeVisible();
    self.editor.focus().select();
    self.updateResults();
    return;
};
DynamicListExField.prototype.setLabel = function(txt) {
    var self = this;
    self.editor.attr('currenttext',txt);
    self.editor.val(txt);
    return;

};
DynamicListExField.prototype.parametersRequired = function(func) {
    var self = this;
    ServiceDesk.setFieldSlot(self.id,'paramsrequired',func);
};
DynamicListExField.prototype.getExtraParameters = function() {
    var self = this;
    var params = {};
    $.extend(params,self.transformFixedParams());
    var _params_required_func = ServiceDesk.getFieldSlot(self.id,'paramsrequired');
    if (!!_params_required_func) {
        _params_required_func(params);
    }
    return params;
};
DynamicListExField.prototype.updateResults = function(last) {
    var self = this;
    if (!!self.loading) return;
    last = xnum(last);
    var params = {};
    var params = {
        'max':self.max_rows
        ,'q':self.editor.val()
        ,'last':last
    };
    if (!!self.params) {
        $.extend(params,self.transformFixedParams());
    }
    var _params_required_func = ServiceDesk.getFieldSlot(self.id,'paramsrequired');
    if (!!_params_required_func) {
        _params_required_func(params);
    }
    var r  = self.results();
    if (last==0) {
        r.html('<div class="nodata">Loading</div>');
        self._more =  null;
        self.result_items = [];
        self._selectedItem = null;
        r.scrollTop();
    }
    self.loading = true;
    var app = self.is_sandboxed ? 'System' : self.app;
    var service = self.is_sandboxed ? 'MetadataMap:ExecuteAction' : self.service;

    if(self.is_sandboxed) {
        params['Instance.Name'] = self.lucy_model;
        params['Instance.Action'] = self.lucy_action;
    }

    ServiceDesk.executeService(app,service,params,function(data) {
         $('.more',r).remove();
         $('.nodata',r).remove();
         $('.more',r).remove();
         self._more = null;

        var rowid;
        for(var i=0;i<data.length;i++) {
            var xr = $('<span />').addClass('mainitem').text(data[i][self.text_field]);
            // var x = $('<div />').text(data[i][self.text_field]).addClass('item');
            var x = $('<div />').addClass('item').append(xr);
            if (!!data[i]['SubObjectID']) {
                var sp = $('<span />').addClass('subitem');
                sp.text(data[i]['SubObjectID']);
                x.append(sp);
            }
            var key = data[i][self.key_field];
            rowid = data[i].__rowid__;
            x.data('data',data[i]);
            x.appendTo(r);
        }
        if (data.length >= self.max_rows) {
            var more = $('<div />').text('More').addClass('item').addClass('more');
            more.attr('last',rowid);
            more.appendTo(r);
            self._more = more;
            setTimeout(function(){
                self.checkForEndOfList();
            },500);
        }
        self.result_items = $('.item',r);
        self.loading = false;
        if (data.length==0 && self.result_items.length==0) {
        r.html('<div class="nodata">'+$L('sys.field-dynamiclist-no-results')+'</div>');
        }
    },function(err) {
        alert(err);
        self.loading = false;
    });
};
DynamicListExField.prototype.selectItemByOffset = function(i) {
    var self = this;
    if (!self.result_items || self.result_items.length==0) return;

    var current_index = _.indexOf(self.result_items,self._selectedItem);

    if (current_index+i >= self.result_items.length) {
        return;
    }
    
    if (current_index+i < 0) {
        if (!self._selectedItem)
            self.selectItem(0);
        return;
    }

    current_index += i;
    self.selectItem(current_index);
};
DynamicListExField.prototype.getFieldID = function(parameter) {
    var self = this;
    if (!!parameter.field) return parameter.field;
    var xf = parameter.xfield;
    if (!xf) return '';
    var xs = self.xscope;
    return $X(xs,xf);
}
DynamicListExField.prototype.transformFixedParams = function() {
    var self = this;

    var out = {};
    if (!self.params) return out;
    for(var i=0;i<self.params.length;i++) {
        var n = self.params[i].name;
        var v = self.params[i].value;
        var f = self.getFieldID(self.params[i]);
        if (!!f && !!n) {
            /*var v = ServiceDesk.getFieldValue(f);
            parameters[n] = xstr(v);*/
            ServiceDesk.gatherFieldValues(f,n,out);
        }
        if (!!n && !!v) {
            out[n] = v;
        }
    }
    return out;
};
DynamicListExField.prototype.loadPopup = function(_view,ot){
    var self = this;
    var params = self.transformFixedParams();

    var param_gen = function(_p) {
        var _params_required_func = ServiceDesk.getFieldSlot(self.id,'paramsrequired');
        if (!!_params_required_func)
            _params_required_func(_p);
        return $.extend({'slid':self.id},_p);
    };

    var b = parseAppUri(_view);
    var app_r = function() {
        return self.hr.attr('xapp');
    };
    var view_r = function() {
        return self.hr.attr('xview');
    };
    self.hr.attr('xapp', b.app);
    self.hr.attr('xview', b.view);
    self.hr.attr('xot',ot);
    if (!self.seed) self.seed = Number(Date.now());
    var seed = self.seed;
    ServiceDesk.loadViewInPopup(self.hr,app_r,view_r,function(){return param_gen(params);},self.id+b.app+b.view+seed/*Number(Date.now())*/,function(c){
        $(c).addClass('sl_modal_container').attr('slid',self.id).attr('sl_ot',self.hr.attr('xot'));
    });

};
DynamicListExField.isControlVisible = function(elem) {
    if ($(elem).height() == 0) return false;
    var parent = $(elem).parent('.scrollable');
    var docViewTop =  $(parent).offset().top;
    var docViewBottom = docViewTop + $(parent).height();

    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();
    // console.log('X',$(elem).offset(),docViewTop,docViewBottom,elemTop,elemBottom);
    return (
            ((elemTop <= docViewBottom) && (elemBottom >= docViewBottom))
            || ((elemTop <= docViewTop) && (elemBottom >= docViewTop))
        );
}
DynamicListExField.prototype.loadPopupForObjectType = function(ot) {
    var self = this;
    var ot_item = _.find(self.objectTypeMap,function(x){
        return String.matches(ot,x.object_type);
    });
    if (!!ot_item) {
        self.loadPopup(ot_item.view,ot_item.object_type);
        return;
    } else {
        if (String.matches(ot,self.objectType())) {
            self.loadPopup(self.searchView);
        }
    }
};
DynamicListExField.prototype.selectItem = function(r) {
    var self = this;
    if (typeof r=='number')
        r = self.result_items[r];
    r = $(r);
    if (r.hasClass('more')) {
        var last = r.attr('last');
        self.updateResults(last);
        r.startLoadingAnimation();
        return;
    }
    if (!!self._selectedItem)
        $(self._selectedItem).removeClass('active');
    r.addClass('active');
    self._selectedItem = r[0];

    var offset = 0;
    var active = _.indexOf(self.result_items,self._selectedItem);
    self.result_items.slice(0, active).each(function() {
        offset += this.offsetHeight;
    });
    var list = self.results();
    var activeItem = $(self._selectedItem);
    if((offset + activeItem[0].offsetHeight - list.scrollTop()) > list[0].clientHeight) {
        list.scrollTop(offset + activeItem[0].offsetHeight - list.innerHeight());
    } else if(offset < list.scrollTop()) {
        list.scrollTop(offset);
    }
};
DynamicListExField.prototype.selectCurrentItem = function() {
    var self = this;
    var r = self.results();
    var active = $('.active',r);
    if (!active.exists()) return;
    var data = active.data('data');
    if (!data) return;
    self.setItem(data)
};
DynamicListExField.prototype.setItem = function(data) {
    var self = this;
    var old_v = self.$hidden.val();
    var old_t = xstr(self.objectType());
    $(self).data('selectedKey',data[self.key_field]).data('selectedText',data[self.text_field]);
    var ot = data[self.type_field];
    if (!ot) ot = self.firstObjectType();
    self.objectType(ot);
    self.$hidden.val(data[self.key_field]);
    self.setLabel(data[self.text_field]);
    if ( (old_v != data[self.key_field]) || (xstr(ot).toUpperCase() != old_t.toUpperCase()) ) {
        $$(self.id).trigger('onitemselected',[data]);
    }
    self.editor.val(data[self.text_field]);
    self.hideResults();
};
DynamicListExField.prototype.val = function(key,txt) {
    var self = this;

    var current = self.hdn.val();
    if (!!key) {
        self.hdn.val(key);
    }
    if (!!txt) {
        self.hdn_txt.val(txt);
    }
    return current;
};
DynamicListExField.prototype.text = function(txt) {
    var self = this;
    if (typeof txt == 'undefined') return self.editor.val();
    if (txt=="") {
        self.editor.val(self.nodata);
        self.editor.addClass('nodata');
    } else {
        var _txt = txt;
        if (self.canContractObjectID)
            _txt = ServiceDesk.contractObjectIDToText(txt);
        self.editor.val(_txt);
        self.editor.removeClass('nodata');
    }
    return self.editor.val();
};
DynamicListExField.prototype.canClearObjectType = function() {
    var self = this;
    return self.objectTypeMap.length > 0;
};
DynamicListExField.prototype.forceClearItem = function() {
    var self = this;
    self.editor.val('');
    $(self).data('selectedKey','').data('selectedText','');
    if (self.canClearObjectType()) {
        self.hdn_ot.val('');
    }
    self.$hidden.val('');
    self.setLabel('');
}
DynamicListExField.prototype.clearItem = function() {
    var self= this;
    if (!self.allow_empty) return;
    if (self.editor.val()!="") {
        self.forceClearItem();
        $$(self.id).trigger('onitemselected');
    }
};
DynamicListExField.prototype.getObject = function() {
    var self= this;
    var ctrl = $$(self.id);

    var ot = self.objectType();
    if (ot=='' && self.allowedObjectTypes != '') return null;
    // if (ot=='') return null;

    var ok = xstr($(self).data('selectedKey'));
    var oid = xstr($(self).data('selectedText'));
    if (ok!="" && oid!="") {
        return {ObjectKey:ok,ObjectID:oid,ObjectType:ot};
    }
};
DynamicListExField.prototype.setObject = function(obj) {
    var self = this;

    if(obj==null) return;

    var ctrl = $$(self.id);

    var old_v = self.$hidden.val();
    var old_t = xstr(self.objectType())

    $(self).data('selectedKey',obj.ObjectKey)
    $(self).data('selectedText',obj.ObjectID);
    self.objectType(obj.ObjectType);
    self.$hidden.val(obj.ObjectKey);

    if ((old_v != obj.ObjectKey) || (old_t.toUpperCase() != xstr(obj.ObjectType).toUpperCase())) {
        $$(self.id).trigger('onitemselected',[obj]);
    }

    self.hideResults();
    $(ctrl).val($(self).data('selectedText'));
    self.setLabel($(self).data('selectedText'));
};
DynamicListExField.prototype.getValue = function() {
    return this.$hidden.val();
};
DynamicListExField.prototype.registerChangeEvent = function(func){
    //$$(this.id).bind('onblur',func);
    $$(this.id).rebind('onitemselected',func);
};
DynamicListExField.clearItem = function(id) {
    //TODO: Type-check?
    __Fields__[id].clearItem();
};
DynamicListExField.edit = function(id) {
    //TODO: Type-check?
    __Fields__[id].edit();
};
DynamicListExField.prototype.searchForItem = function(object_type) {
    var self = this;
    var params = self.transformFixedParams();
    var param_gen = function(_p) {
        var _params_required_func = ServiceDesk.getFieldSlot(self.id,'paramsrequired');
        if (!!_params_required_func)
            _params_required_func(_p);
        return $.extend({'slid':self.id},_p);
    };
    if (!!self.selectionView) {
        var key = xint(self.selectionViewKey);
        var qi_params = {'key':key};
        qi_params['otlist'] = self.allowedObjectTypes;
        param_gen(qi_params);
        
        var x = parseAppUri(self.selectionView);
        
        _.defer(function(){
            ServiceDesk.loadViewInQuickInfo(self.hr,x.app,x.view,qi_params,function(qb){
                qb.addClass('slcontainer');
                qb.attr('slid',self.id);
            });
        });
       
        return;
    }
    if (self.objectTypeMap.length==0) {
        self.loadPopup(self.searchView);
        return;
    }
    if (self.objectTypeMap.length==1) {
        self.loadPopup(self.objectTypeMap[0].view,self.objectTypeMap[0].object_type);
        return;
    }
    if (!!object_type) {
        var ot_item = _.find(self.objectTypeMap,function(x){
            return String.matches(object_type,x.object_type);
        });
        if (!!ot_item) {
            self.loadPopup(ot_item.view,ot_item.object_type);
            return;
        }
    }
    _.defer(function(){
        var qi = ServiceDesk.showBubble(self.hr,'listbubble popupmenu');
        var lis = [];
        for(var i=0;i<self.objectTypeMap.length;i++) (function(){
            var obj = self.objectTypeMap[i];
            var a = $('<a />').attr('href','#').text(obj.object_label);
            a.touchClick(function(_e){
                _e.stopPropagation();
                _e.preventDefault();
                ServiceDesk.hideBubbles();
                ServiceDesk.hideBubbleSheet();
                self.loadPopup(obj.view,obj.object_type);
            });
            a.addClass('sidebar_link');
            var dv = $('<div />').append(a);
            qi.content.append(dv);
        })();
    });
    /*
    ServiceDesk.loadViewInPopup(self.hr,self.app,self.view,$.extend({'slid':self.id},params),self.id,function(c){
        $(c).addClass('sl_modal_container').attr('slid',self.id);
    });
*/
};

//ListExField
var ListExField = function(id) {
    var self = this;
    self.id = id;
    self.ctrl = $$(self.id);
    self.ctrl.bind('change',function(evnt){
        self.updateLabel();
    });
    self.ctrl.bind('focus',function(evnt) {
        var label = self.ctrl.parents('.field-select').find('.textlabel');
        label.addClass('focus');
    });
    self.ctrl.bind('blur',function(evnt) {
        var label = self.ctrl.parents('.field-select').find('.textlabel');
        label.removeClass('focus');
    });
};
ListExField.prototype.hideField = function() {
    var self = this;

    if (ServiceDesk.hideContainedField(self.id)) return;

    var p = self.getFieldContainer();
    p.makeInvisible();
};
ListExField.prototype.showField = function() {
    var self = this;

    if (ServiceDesk.showContainedField(self.id)) return;

    var p = self.getFieldContainer();
    p.makeVisible();
};
ListExField.prototype.disable = function() {
    var self = this;
    var p = self.getFieldContainer();
    p.addClass('disabled');
    self.ctrl.attr('disabled','disabled');
};
ListExField.prototype.enable = function() {
    var self = this;
    var p = self.getFieldContainer();
    p.removeClass('disabled');
    self.ctrl.removeAttr('disabled');
};
ListExField.prototype.getFieldContainer = function() {
    return this.ctrl.parents('.field-select');
};
ListExField.prototype.getElement = function() {
    return this.ctrl;
}
ListExField.prototype.updateLabel = function() {
    var self = this;
    var ctrl = $$(self.id);
    ListExField.updateLabel(ctrl);
};
ListExField.updateLabel = function(ctrl) {
    var label = ctrl.parents('.field-select').find('.textlabel');
    if (!label.exists()) return;
    var option = ctrl.find('option:selected');
    if (option.exists()) 
        label.text(option.text());
    else
        label.text(ctrl.attr('unselectedtext'));
};
ListExField.createWrapper = function(id) {
    var sl = $('<select />');
    var fl = $('<span />').addClass('field-select');
    $('<span />').addClass('textlabel').appendTo(fl);
    $('<span />').addClass('down-arrow icon-down-arrow').appendTo(fl);
    sl.appendTo(fl);
    sl.bind('change',function(){
        ListExField.updateLabel(sl);
    });

    return [fl,sl];
}
ListExField.prototype.getValue = function() {
    return this.ctrl.val();
};
ListExField.prototype.getText = function() {
    var self = this;
    var ctrl = $$(self.id);
    var option = ctrl.find('option:selected');
    if (option.exists()) 
        return option.text();
    else
        return ctrl.attr('unselectedtext');
};

ListExField.prototype.setValue = function(v) {
    this.ctrl.val(v);
    this.updateLabel();
};
ListExField.prototype.setValueFromText = function(txt) {
    var self = this;
    var ctrl = this.ctrl;
    $(ctrl).find('option').each(function(){
        if (String.matches(this.text,txt)) {
            self.setValue(this.value);
            return;
        }
    });
};
ListExField.prototype.registerChangeEvent = function(func) {
    this.ctrl.rebind('change',func);
};
ListExField.prototype.loadValues = function(objects,_opts) {
    var self = this;
    var opts = _opts || {};
    var s = $(self.ctrl);

    var unselected_value = s.attr('unselectedvalue');
    var unselected_text = s.attr('unselectedtext');
    var key_field = opts.key_field || s.attr('keyfield');

    //Damn typo
    var text_field = opts.text_Field || opts.text_field || s.attr('textfield');

    s.empty();
    var addObject = function(obj) {
        var opt = $('<option />').val(obj[key_field]).html(obj[text_field]);
        s.append(opt);
    };
    var empty = new Object();
    empty[key_field] = unselected_value;
    empty[text_field] = unselected_text;
    addObject(empty);
    _.forEach(objects,addObject);
    self.updateLabel();
};
ListExField.create = function(opts) {
    var source = opts.source;
    if (typeof source=='string') {
        source = __ServiceData__[source];
    }
    var obj  = opts.object;
    var key_field = opts.key_field;
    var text_field = opts.text_field;
    var value = null || obj[key_field];

    id = opts.id || ServiceDesk.generateID();
    var s = $('<select />').attr('id',id);
    
    _.forEach(source,function(x){
        var opt = $('<option />').val(x[key_field]).html(x[text_field]);
        s.append(opt);
        if (x[key_field] +"" == value+"") opt.attr('selected','selected');
    });

    var lf= new ListExField(id);
    lf.ctrl = s;
    __Fields__[id] = lf;
    return lf;
    
};
//Override
DynamicListExField.forContainer = function(hr) {
    var parent = $(hr).parents('.slcontainer');
    if (!parent.exists()) return;
    var sl = parent.attr('slid');
    var field = __Fields__[sl];
    return field;
};
DynamicListExField.searchObjectType = function(hr,ot) {
    var field = DynamicListExField.forContainer(hr);
    if (!field) return;
    field.loadPopupForObjectType(ot);
};
DynamicListExField.assignObject = function(hr,obj) {
    var field = DynamicListExField.forContainer(hr);
    if (!field) return;
    field.setObject(obj);
};


var JSONField = function(id) {
    var self = this;
    self.id = id;
};
JSONField.prototype.getValue = function() {
    var self = this;
    var json = $$(self.id).text();
    return JSON.parse(json);
};
//EditTable field
var EditTableEx = function(id,data,col_defs,opts) {
    var self = this;

    self.id = id;
    self.data = data;
    self.columns = col_defs || [];
    self.opts = opts;
    self.templates_compiled = false;
    self.canDeleteFunc = null;
    self.deleteFunc = null;
    self.column_funcs = { };

    $(document).ready(function(){
        self.reload();
    });
};

EditTableEx.prototype.columnFunc = function(col,func) {
    var self = this;
    self.column_funcs[col] = func;
};
EditTableEx.prototype.setColumn= function(col,column_type) {
    var self = this;
    return self.columnFunc(col,column_type);
};
EditTableEx.prototype.compileTemplates = function() {
    var self = this;
    _.each(self.columns,function(col){
        if (col.template.trim() != "")
            col.compiled_template = _.template(col.template);
        else
            col.compiled_template = function(obj) {
                //TODO: Proper escaping here
                if (!col.field) return "";
                return $('<span />').text(obj.row[col.field]).html();
            }
    });
    self.templates_compiled = true;
};

EditTableEx.prototype.saveData = function(trigger_change) {
    var self = this;
    var obj = this.data;
    var data_container = $$(this.id+"__data");
    data_container.val(JSON.stringify(obj));
    if (typeof trigger_change == 'undefined' || !!trigger_change)
        self.dataChanged();

};

EditTableEx.prototype.deleteRow = function(i,trigger_change) {
    Array.remove(this.data,i);
    this.saveData(trigger_change);
};

EditTableEx.prototype.addObject = function(obj,opts) {
    opts = opts||{'highlight':true};
    if (this.opts.allow_duplicates != 'true' ) {
        var key_field = xstr(this.opts.key_field)

        if (!key_field) {
            console.log('Keyfield not specified for not allowing duplicates');
        }

        var items = Array.filter(this.data,(function(x) { return x[key_field] == obj[key_field];}));

        if (!!items && items.length>0) {
            var msg = this.opts['duplicate.message'] || 'This entry has already been added';
            alert(msg);
            return false;
        }
    }
    this.data.push(obj);
    this.saveData();
    var reload_opts = {};
    if (opts.highlight) reload_opts['highlight'] = obj;
    this.reload(reload_opts);
    return true;
};
EditTableEx.prototype.getFieldContainer = function() {
    var self = this;
    return $$(self.id + "__table");
};
EditTableEx.prototype.getElement =EditTableEx.prototype.getFieldContainer;
EditTableEx.prototype.reload = function(opts) {
    var self = this;
    
    opts = opts || {};
    var edit_table = this;
    if (!this.templates_compiled) this.compileTemplates();
    var table = $$(edit_table.id+"__table");
    table.empty();
    table.addClass('fe_table');
    var body = $('<tbody />');
    table.append(body);
    var header =  $('<tr />').addClass('fe_header');
    var col_widths = [];
    var total_width= 0;
    $.each(edit_table.columns,function(i,col){
        var sw = xstr(col.width);
        var w = 1;
        if (sw=='*' || sw=='') w = 1;
        else w = xint(sw);
        col_widths.push(w);
        total_width += w;
    });
    body.append(header);
    $.each(edit_table.columns,function(i,col){
        var col_val = col.header;
        var pct = (col_widths[i]*100)/total_width;
        var wp = pct.toFixed(2) + '%';
        var td = $('<td />').text(col_val);
        if (i < edit_table.columns.length-1)
            td.attr('width',wp);
        header.append(td);
    });

    //Actions
    header.append( $('<td />').text(''));

    var highlight_row = null;
    var highlight_obj = opts.highlight;
    var rows = edit_table.data;
    for(var i=0;i<rows.length;i++) {
        var row = rows[i];
        var tr = $('<tr />').addClass('fe_row');
        var first_cell = null;
        var last_cell = null;
        for(var c=0;c<edit_table.columns.length;c++) {
            var col = edit_table.columns[c];
            var cell = $('<div />');
            if (!!self.column_funcs[col.id]) {
                self.column_funcs[col.id](self,i,cell);
            } else {
                var col_val = col.compiled_template({'row':row,'index':i,'column':col.id});
                cell.html(col_val);
            }
            if (first_cell==null) first_cell= cell;
            last_cell = cell;
            tr.append($('<td />').append(cell));
        }


        if (last_cell != null && getBool(self.opts.allow_delete,false)) {
            (function(){
                if (!!self.canDeleteFunc && !self.canDeleteFunc(row)) return;
                var count = i;
                var hover_option = $('<span />').addClass('edit-table-actions');
                var del_link = $('<a />').attr('href','#').addClass('icon-delete')
                .click(function(evnt){
                    evnt.preventDefault();
                    edit_table.deleteRow(count,false);
                    edit_table.reload();
                    edit_table.dataChanged();
                }).appendTo(hover_option);
                // hover_option.append($('<div />').addClass('dummy'));
                last_cell.append(hover_option).addClass('');
                last_cell.closest('tr').addClass('');
            })();
        }

        //tr.append(action_cell);

        body.append(tr);
        if (row==highlight_obj) {
            $(tr).addClass('tohighlight');
        }
    }
    if (!ServiceDesk.isMobile()) {
        $('.tohighlight').effect('highlight',{},5000,function(){
            $('.tohighlight').removeClass('tohighlight');
        });
    }
};
EditTableEx.prototype.getValue = function() {
    return this.data;
};
EditTableEx.ColumnTypes = {};
EditTableEx.ColumnTypes.IntColumn = function(opts) {
    var key_field = opts.key_field;
    var id = opts.id || ServiceDesk.generateID();
    return function(table,row,cell) {
        var obj = table.data[row];
        var tf = TextField.create({
            'id':id + '__' + row
        });
        tf.appendTo(cell);
        tf.setValue(obj[key_field]);
        tf.registerChangeEvent(function(){
            obj[key_field] = tf.getValue();
            table.saveData();
        });
    }
};
EditTableEx.ColumnTypes.TextColumn = function(opts) {
    var key_field = opts.key_field;
    var id = opts.id || ServiceDesk.generateID();
    return function(table,row,cell) {
        var obj = table.data[row];
        var tf = TextField.create({
            'id':id + '__' + row
        });
        tf.appendTo(cell);
        tf.setValue(obj[key_field]);
        tf.registerChangeEvent(function(){
            obj[key_field] = tf.getValue();
            table.saveData();
        });
    }
};
EditTableEx.prototype.registerChangeEvent = function(func) {
    var self = this;
    var ctrl = self.getFieldContainer();
    ctrl.rebind('datachanged',func);
};
EditTableEx.prototype.dataChanged = function() {
    var self = this;
    var ctrl = self.getFieldContainer();
    ctrl.trigger('datachanged');
};
EditTableEx.prototype.gatherPostFields = function(p) {
    var self = this;
    p[self.id+"__data"] = $$(self.id+"__data").val();
};
