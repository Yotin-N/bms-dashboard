/* Page initialization goeth here */
$(document).ready(function() {
    var click_handler = ($.supportsTouch() && 'touchstart') || 'click';
    $('.pin_direct').live(click_handler,function(evnt) {
        // evnt.stopPropagation();
        evnt.preventDefault();
        var pin = $(this);
        var ot = pin.attr('ot');
        if (!ot) return;
        var elm = $$(pin.attr('target_element'));
        obj = {'ObjectType':elm.attr('ot'),'ObjectKey':elm.attr('ok'),'ObjectID':elm.text().trim()};
        ServiceDesk.addPinnedObject(obj);
    });
    $('.kepin').live(click_handler,function(evnt) {
        // evnt.stopPropagation();
        evnt.preventDefault();
        var pin = $(this);
        var ot = pin.attr('ot');
        if (!ot) return;
        var elm = $$(pin.attr('target_element'));
        obj = {'ObjectType':elm.attr('ot'),'ObjectKey':elm.attr('ok'),'ObjectID':elm.text().trim()};
        ServiceDesk.hideBubbles();
        ServiceDesk.showKE(null,{object:obj});
    });
    $('.pin_field').live(click_handler,function(evnt){
        evnt.preventDefault();

        var pin = $(this);
        var ot = pin.attr('ot');
        var otl = pin.attr('otlabel');
        if (!ot) return;

        var obj = null;
        var field = pin.attr('target_field');
        var elm = $$(pin.attr('target_element'));
        var cb = null;
        if (elm.exists()) {
            obj = {'ObjectType':elm.attr('ot'),'ObjectKey':elm.attr('ok'),'ObjectID':elm.text().trim()};
            if (obj.ObjectID=="") {
                console.log('No pin object found:',obj)
                obj = null;
                return;
            }
            ot = '';
        } else {
            if (!__Fields__[field]) {
                alert('Pin field does not exist');
                return;
            }
            if (!__Fields__[field].setObject) {
                ot = "";
            }
            if (!!__Fields__[field].getObject) {
                obj = __Fields__[field].getObject();
            }
        }

        
        ServiceDesk.showPinQuickInfo(pin,obj,ot,otl,function(selected_obj){
            __Fields__[field].setObject(selected_obj);
        });

    });
    $('.content_qi').live(click_handler,function(evnt){
        var self = this;
        // evnt.stopPropagation();
        evnt.preventDefault();
        var content = $(self).find('.content').first();
        if (!content.exists() && !$(self).data('cloned_content')) return;
        var qi = ServiceDesk.showBubble($(self),'listbubble');
        var cloned_content = $(self).data('cloned_content');
        if (!cloned_content) {
            cloned_content = content.clone();
            $(self).data('cloned_content',cloned_content);
            content.remove();
        }
        cloned_content.clone().appendTo(qi.content);
        //content.clone().appendTo(qi.content);
    });
    $('.customquickinfo').live(click_handler,function(evnt) {
        var self = this;
        // evnt.stopPropagation();
        evnt.preventDefault();
        var key = $(self).attr('key');
        var app = $(self).attr('app');
        var view = $(self).attr('view');
        var qi_class = $(self).attr('qitype');
        ServiceDesk.showQuickInfoWithView($(self),app,view,{'key':key},null,qi_class);
    });
    $('.quickinfo').live(click_handler,function(evnt) {
        var self = this;
        // evnt.stopPropagation();
        evnt.preventDefault();
        var ok = $(self).attr('ok');
        var ot = $(self).attr('ot');
        if (!!ok && !!ot) {
            var inj_t = $(self).attr('injection_type');
            var inj_d = $(self).attr('injection_data');
            if (!inj_d)
                inj_d = $(self).data('injection_data');
            
            
            var view = xstr($(self).attr('view'));
            var app = xstr($(self).attr('app'));
            if (ot.search('\\.')>0)  {
                var _p = parseAppUri(ot);
                if (app.length==0) app = _p.app;
                if (view.length==0) view = _p.view.toLowerCase() + '.qi';

            }
            if (view.length>0) {
                ot = {'app':ot,'view':view}
                if (app.length>0) ot.app = app;
            }
            
            if (!!inj_t && !!inj_d) {
                ServiceDesk.showQuickInfoWithInjection($(self),ot,ok,inj_t,inj_d);
            } else {
                ServiceDesk.showQuickInfo($(self),ot,ok);
            }
        }
    });
    function fromCalendar(target) {
        return ($(target).parents(".ui-datepicker").size() > 0)
            || ($(target).parents(".ui-datepicker-header").size() > 0)
            || ($(target).parents(".ui-datepicker-buttonpane").size() > 0)
            || ($(target).hasClass("ui-datepicker"))
            || ($(target).hasClass("ui-datepicker-header"))
            ;
    }
    $('html').click(function(evnt){
        if (fromCalendar(evnt.target)) {
            /* click was within a date picker */
            evnt.stopPropagation();
            return;
        }
        ServiceDesk.hideBubbles($(this),evnt.target);
    });
    $('html').on('touchstart',function(evnt){
        if (fromCalendar(evnt.target)) {
            /* click was within a date picker */
            evnt.stopPropagation();
            return;
        }
        ServiceDesk.hideBubbles($(this),evnt.target);
    });
    $('.weblet_cell .util .remove_weblet').live('click',function(evnt){
        evnt.stopPropagation();
        evnt.preventDefault();
        var uk = __loggedin_user_key__;
        if (uk==0) {
            alert('You are not logged in');
            return;
        }
        var weblet = $(this).closest('.weblet_cell');
        if (!weblet.exists()) {
            alert('Weblet not available for deletion');
            return false;
        }
        var app = weblet.attr('app');
        var id = weblet.attr('weblet');
        $(this).executeCommand('Session/removeweblet',{'UserKey':uk,'App':app,'ID':id},function(data){
            weblet.remove();
        },function(err) {
            alert('Error removing weblet from home screen: ' + err);
        });
    });
    $('.weblet_cell .util .add_weblet').live('click',function(evnt){
        evnt.stopPropagation();
        evnt.preventDefault();
        var uk = __loggedin_user_key__;
        if (uk==0) {
            alert('You are not logged in');
            return;
        }
        var weblet = $(this).closest('.weblet_cell');
        if (!weblet.exists()) {
            alert('Weblet not available for pinning');
            return false;
        }
        var app = weblet.attr('app');
        var id = weblet.attr('weblet');
        var self = this;
        $(this).executeCommand('Session/addweblet',{'UserKey':uk,'App':app,'ID':id},function(data){
            ServiceDesk.flashNotification('Weblet added to home');
            $(self).makeInvisible();
            $(self).parent().find('.added_weblet').makeVisible();
        },function(err) {
            alert('Error adding weblet to home screen: ' + err);
        });
    });
    $('.object_locker.unlocked').live('click',function(evnt){
        var ot = $(this).attr('ot');
        var ok = $(this).attr('ok');
        var s = parseModelUri(ot);
        $(this).executeService(s.app,s.model+":Lock",{'key':ok},function(){
            alert('This item has been locked');
            location.reload();
        });
    });
    $('.object_locker.locked').live('click',function(evnt){
        var ot = $(this).attr('ot');
        var ok = $(this).attr('ok');
        var s = parseModelUri(ot);
        $(this).executeService(s.app,s.model+":Unlock",{'key':ok},function(){
            alert('This item has been unlocked');
            location.reload();
        });
    });
    $('.model_delete').live('click',function(evnt){
        var hr = $(this);
        var model = $(hr).attr('model');
        var msg = $(hr).attr('message');
        var st = $(hr).attr('searchtable');
        var key = $(hr).attr('key');
        var mode = $(hr).attr('delete_mode');
        var deltitle = $(hr).attr('delete_title') || '';
        if (!key) return;
        if (!model) return;
        if (mode!='dialog') {
            var c = $(hr).attr('prompt');
            if (!!c) {
                var x = confirm(c);
                if (!x) return;
            }
            $(hr).executeModelAction(model,'Delete',{'key':key},function(){
                if (!!msg) ServiceDesk.flashNotification(msg);
                if (!!st && !!(__SearchTables__[st])) {
                    __SearchTables__[st].reloadCurrent();
                }
            },function(err){
                alert(err);
            });
            return;
        }
        if (mode == 'dialog') {
            var next = $(hr).attr('next');
            if (next=='') next = ServiceDesk.rootUrl('');
            else next = ServiceDesk.appUrl(next);
            var can_hide = $(hr).attr('can_hide');
            ServiceDesk.startLoading(hr);
            ServiceDesk.loadRemoteFormInLayer('System','deleteobject.partial',{'key':key,'ot':model,'canhide':can_hide,deltitle:deltitle},function(data,action){
                if (action == 'hideaction') {
                    location.reload();
                } else {
                location.href = next;
                }
            },{loaded:function(){ServiceDesk.doneLoading(hr);}});
            return;
        }
    });

    $('.expand-group').live(click_handler,function(evnt) {
        evnt.preventDefault();
        var toggler = $(this);
        var parent = toggler.parents('.expandcontainer');
        parent.removeClass('collapsed');
    });
    $('.collapse-group').live(click_handler,function(evnt) {
        evnt.preventDefault();
        var toggler = $(this);
        var parent = toggler.parents('.expandcontainer');
        parent.addClass('collapsed');
    });
    // $('.sidebar_group .visible_toggler').live('click',function(evnt) {
    //     var toggler = $(this);
    //     var content = toggler.parents('.sidebar_group').children('.sidebar_content');
    //     if (content.isVisible()) {
    //         toggler.removeClass('expanded');
    //         toggler.addClass('collapsed');
    //         content.makeInvisible();
    //     } else {
    //         toggler.removeClass('collapsed');
    //         toggler.addClass('expanded');
    //         content.makeVisible();
    //     }
    // });
    var flashMessages = function(){
        var msg = '';
        /*
        $('.flashmessage .message').each(function(){
            var h  = $(this).html().trim();
            if (h.length==0) return;
            msg += $(this).html() + '<br />';
        });
        if (msg.length>0) {
            console.log(msg);
            ServiceDesk.flashNotification(msg,true);
        }
        */
        $('.flashmessage .message').fadeOut(1000);
    };
    _.delay(flashMessages,500);
    ServiceDesk.beginPolling(1000*60*5);
    _.delay(function(){
        if (!!ServiceDesk.BPMStage && !!ServiceDesk.BPMKey) {
            ServiceDesk.checkBPMStage();
        }
    },500);
    if ($('#__formerrormessage__.haserror').exists()) {
        alert($('#__formerrormessage__.haserror').text());
    }

    $(document).bind('keydown',function(evnt){
        if (evnt.keyCode == 112) { //F1
            evnt.stopPropagation();
            evnt.preventDefault();
            Guides.showAllElementHints();
        }
    });

    if (typeof __sessionWillExpire == 'boolean') {
        if (__sessionWillExpire) {
            var d = $('<div />');
            d.addClass('user-warning closed');
            $('body').append(d);
            setTimeout(function(){
                d.removeClass('closed');
            },1000);
            d.text($L('sys.session-expiry-warning'));
            d.touchClick(function(e){
                e.preventDefault();
                e.stopPropagation();
                $(this).addClass('closed');
            });
        }
    }


});
$(document).bind('itemSelectedFromTable',ServiceDesk.itemSelectedFromTable);
