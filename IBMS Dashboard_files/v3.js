if (typeof console == 'undefined' || typeof(console.log) == 'undefined') {
    console = {
        log: function(){}
    };
}
/**
Checks to see if the current page is being viewed in a small mobile-sized screen.
Use this for making responsive pages.
*/
var isMobileWidth = function() {
    if (!screen) return false;
    return screen.width <= 767;
};
jQuery.parseXml = function(xml) {
    if (typeof xml == 'string') return $.xmlDOM('<stupidhackforie>' + xml + '</stupidhackforie>').children().children().first();
    return $(xml);
};

Function.prototype.partial = function(){
    var fn = this, args = Array.prototype.slice.call(arguments);
    return function(){
        var arg = 0;
        for ( var i = 0; i < args.length && arg < arguments.length; i++ )
            if ( args[i] === undefined )
                args[i] = arguments[arg++];
            return fn.apply(this, args);
    };
};
Array.filter = function(items,func) {
    var result = [];
    for(var i=0;i<items.length;i++)
        if (func(items[i]))
            result.push(items[i]);
    return result;
};

Array.first = function(func) {
    var result = [];
    for(var i=0;i<this.length;i++)
        if (func(this[i]))
            return this[i];
        return null;
};

Array.remove= function(items,from, to) {
  var rest = items.slice((to || from) + 1 || items.length);
  items.length = from < 0 ? items.length + from : from;
  return items.push.apply(items, rest);
};

Array.removeItem = function(items,item) {
    var i = _.indexOf(items,item);
    if (i < 0) return;
    Array.remove(items,i);
};

Array.removeAllItems = function(items) {
    while (items.length > 0)
        items.pop();
};


/**
Generates a unique identifier
*/
function generateUUID(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
}

/**
Strip all leading and trailing whitespace from a string
@function
@memberof String
@name trim
*/
String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g,"");
};


/**
Strip all leading whitespace from a string
*/
String.prototype.ltrim = function() {
    return this.replace(/^\s+/,"");
};


/**
Strip all trailing whitespace from a string
*/
String.prototype.rtrim = function() {
    return this.replace(/\s+$/,"");
};



/**
Splits a string by the specified character and removes empty members.
So 'a,b,c,,d,,e'.split(',') will return ['a','b','c','d','e']
*/
String.prototype.splitProper = function(ch) {
    var parts = this.split(ch);
    return _.filter(parts,function(x){return !!x;});
};


/**
Case insensitive comparison of two strings
String.matches("Apple","apple") returns true
*/
String.matches = function(a,b) {
    return a.toUpperCase() == b.toUpperCase();
};

/**
Checks if a string ends with a given suffix
'filename.xlsx'.endsWith('.xlsx') returns true

This is case sensitive
*/
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

// Some product apps still use "$(elem).live"
// this could cause any subsequent js calls in the view to not execute
// like setting additional params via "ServiceDesk.parametersRequired" for example
// https://stackoverflow.com/questions/14354040/jquery-1-9-live-is-not-a-function
jQuery.fn.extend({
    live: function (event, callback) {
        if (this.selector) {
            jQuery(document).on(event, this.selector, callback);
        }
        return this;
    }
});

jQuery.fn.center = function (opts) {
    opts = opts || {};
    var h = $(window).height();
    var ws = $(window).scrollTop();
    // https://stackoverflow.com/questions/12093806/jquery-1-8-outer-height-width-not-working
    var top = ((h- this.outerHeight(false)) / 2) + ws;
    this.css("position","absolute");

    if (isMobileWidth()) {

        if (opts.mobilePos == 'top') {
            this.css({
                top:ws
                ,left:'0px'
            });
            return;
        }
    }

    var max_top = 72;
    if ( (top - ws) > max_top) top = max_top + ws;
    if (top < ws) top = ws;
    this.css('top',top+'px');
    // https://stackoverflow.com/questions/12093806/jquery-1-8-outer-height-width-not-working
    this.css("left", (($(window).width() - this.outerWidth(false)) / 2) + $(window).scrollLeft() + "px");
    return this;
};

jQuery.prototype.showMenu = function(menu) {
    var p = $(this).offset();
    menu.css({
        'position':'absolute'
        ,'visibility':'visible'
    });
    menu.offset({
        left: p.left
        ,top: p.top + $(this).outerHeight()
    });
};
jQuery.prototype.rebind = function(event,func) {
    this.unbind(event,func);
    return this.bind(event,func);
};
jQuery.prototype.getMax = function(evaluator) {
    var value = null;
    this.each(function(){
        value = evaluator(this,value);
            });
    return value;
};

jQuery.prototype.setStretchedHeight = function() {
    if (isMobileWidth()) return;
    var elm  = this;
    $(elm).height($(window).height() - $(elm).offset().top);
};
jQuery.prototype.stretchHeight = function() {
    var elm = this;

    var resizer = _.throttle(function(){
        $(elm).setStretchedHeight();
    },500,{leading:false});

    $(window).resize(resizer);

    $(this).setStretchedHeight();
};

/**
jQuery function to check if any elements were present in the result set

Example: $('.someclass').exists() returns true if any elements with css class 'someclass' exist
*/
jQuery.prototype.exists = function() {
    return this.length>0;
};
jQuery.prototype.setupCustomScrolling = function() {
    return;
    //TODO:
    var p = $(this).parent();
    p.addClass('nano');
    $(this).addClass('nanocontent');
    p.nanoScroller({contentClass:'nanocontent'});

};
jQuery.prototype.nodeName= function() {
    return (this.length==0)?"":this[0].nodeName;
};
jQuery.prototype.startLoadingAnimation= function() {
    var url = ServiceDesk.rootUrl('images/throbber.gif');
    $(this).html('<img src="' + url + '" />');
    return this;
};


jQuery.prototype.showLoader = function() {
    $(this).find('.loading_small').makeVisible();
};
jQuery.prototype.hideLoader = function() {
    $(this).find('.loading_small').makeInvisible();
};

jQuery.fn.extend({
insertAtCaret: function(myValue){
  return this.each(function(i) {
    if (document.selection) {
      //For browsers like Internet Explorer
      this.focus();
      sel = document.selection.createRange();
      sel.text = myValue;
      this.focus();
    }
    else if (this.selectionStart || this.selectionStart == '0') {
      //For browsers like Firefox and Webkit based
      var startPos = this.selectionStart;
      var endPos = this.selectionEnd;
      var scrollTop = this.scrollTop;
      this.value = this.value.substring(0, startPos)+myValue+this.value.substring(endPos,this.value.length);
      this.focus();
      this.selectionStart = startPos + myValue.length;
      this.selectionEnd = startPos + myValue.length;
      this.scrollTop = scrollTop;
    } else {
      this.value += myValue;
      this.focus();
    }
  });
}
});

jQuery.prototype.executeCommand = function(service,params,ok,err) {
    var elm = $(this);
    var loader = $('<div />').addClass('loading_small').css('display','inline-block');
    var disp = elm.css('display');
    var hide_action = function() {
        elm.css('display','none');
    }
    var show_action = function() {
        elm.css('display',disp);
    }

    if (elm[0].nodeName=='BUTTON' || elm[0].nodeName == 'INPUT') {
        hide_action = function() {
            $(elm).attr('disabled','disabled');
        }
        show_action = function() {
            $(elm).removeAttr('disabled');
        }
    }
    loader.insertAfter(elm);
    hide_action();

    var url = ServiceDesk.createUrl(service);

    $.ajax({
        type: 'post'
        ,url: url
        ,data: params
        ,dataType: 'json'
        ,success: function(data) {
            show_action();
            loader.remove();
            if (!!ok) ok(data);
        }
        ,error: function(request,status,_e) {
            alert(request.responseText);
            loader.remove();
            show_action();
        }
    });
};


jQuery.prototype.executeModelAction = function(ot,action,params,ok,err) {
    var a = parseModelUri(ot);
    return $(this).executeService(a.app,a.model+":"+action,params,ok,err);
};

/**
Execute a v3 service. The jquery element this was called on will show a 'loading' UI sequence
while the service is executing.
If the jquery element was a button, it will also disable it.

Example: $('#mybutton').executeService('System','SomeModel:SomeAction');
This will cause the button to show a loading animation while the service executes.

@param {string} app - The name of the application that the service is in
@param {string} service - The service being called - for model actions, it should be in Model:Action form.
@param {object} params - A dictionary of parameters to be passed
@param {function} ok - A function to be executed if the service executed. The first parameter to the function will be the data returned - in javascript format
@param {function} err - A function to be called if an error ocurred during execution. This is optional. If not specified, an alert will be shown as the default error handler.


*/
jQuery.prototype.executeService = function(app,service,params,ok,err) {
    var elm = $(this);
    var loader = $('<div />').addClass('loading_small').css('display','inline-block');
    var disp = elm.css('display');
    var hide_action = function() {
        elm.css('display','none');
    }
    var show_action = function() {
        elm.css('display',disp);
    }

    if (elm[0].nodeName=='BUTTON' || elm[0].nodeName == 'INPUT') {
        hide_action = function() {
            $(elm).attr('disabled','disabled');
        }
        show_action = function() {
            $(elm).removeAttr('disabled');
        }
    }
    loader.insertAfter(elm);
    hide_action();
    ServiceDesk.executeService(app,service,params,function(data) {
        try {
            if (!!ok) ok(data);
        } catch(e) {
            show_action();
            loader.remove();
            throw e;
        }
        show_action();
        loader.remove();
    },function(txt) {
        if (!!err) err(txt);
        else alert(txt);
        loader.remove();
        show_action();
    });
}

var __SupportsTouch__ = null;
/* FIXME: Do we need to support touch separately? Seems like its more clunky */
jQuery.supportsTouch = function() {
    return false;
    if (__SupportsTouch__==null)
        __SupportsTouch__ = ('ontouchstart' in document.documentElement);
    return __SupportsTouch__;
}

/* Binds to touchstart for iphone and onclick for everything else */
jQuery.prototype.touchClick = function(func) {
    var mf = function() {
        func.apply(this,arguments);
    };

    if ($.supportsTouch()) {
        $(this).bind('touchstart',mf);
    } else {
        $(this).click(mf);
    }
}

/**
Converts a javascript object to a string
@param {object} o - the object to be converted
*/
function xstr(o) {
    if (!o) return '';
    return '' + o;
}

/**
Converts a javascript object to a Number.
Returns def if the object couldn't be converted to a Number
@param {string} i - the string to convert to a number
@param {Number} def - the default number to return if the string doesn't contain a number
*/
function xnum(i,def) {
    if (!i) {
        if (!def) return 0;
        return def;
    }
    var xn= Number(i);
    if (isNaN(xn)) return (!!def)?def:0;
    return xn;
}

/**
Converts the string to a true/false value.
If the string contains '1' or 'true' then the value is true.
If the string contains '0' or 'false' then the value is false.
Otherwise, the default value is passed.
@param {String} s - The string to evaluate
@param {Boolean} def - Default value to return
*/
function getBool(s,def) {
    if (typeof s == 'boolean') return s;
    if (!def) return (s=='1' || s=='true');
    return !(s=='0' || s=='false');
}

/**
Converts a javascript object to a integer.
Returns def if the object couldn't be converted to a integer
@param {string} i - the string to convert to a integer
@param {Number} [def=0] - the default integer to return if the string doesn't contain a integer
*/
function xint(i,def) {
    if (!i) {
        if (!def) return 0;
        return def;
    }
    return parseInt(""+i,10);
}

function xbool(i,def) {
    if (!def) def = false;

    if (xstr(i).toUpperCase() == 'TRUE') {
        return true;
    }
    if (xstr(i).toUpperCase() == 'FALSE') {
        return false;
    }
    if (xint(i)>0) {
        return true;
    }
    if (!i) {
        return def;
    }
    return def;
}

function jq(myid) {
    if (!myid) return null;
    return  myid.replace(/(:|\.|\[|\]|\/)/g,'\\$1');
}

/**
Returns a jquery wrapped element that has the specified id

Example: $$('mytb') is the same as calling $('#mytb')

The advantage of $$ is that it does proper string escaping
@param {string} id - the element's id

*/
var $$ = function(id) {var x =  $('#' + jq(id));return x; };
var $X = function(xid,id) { return xid + '-' + id;};
var simulateElement = function(pos) {
    return {
        width: function(){ return 1;}
        ,height: function(){ return 1;}
        ,left: function(){ return pos.left}
        ,top: function(){ return pos.top}
        ,right: function(){ return pos.left}
        ,bottom: function(){ return pos.top}
        ,offset: function() {
            return pos;
        }
    };
};
var emptyObject = function(obj) {
    if (obj == null) return true;
    if (typeof obj == 'undefined') return true;
    if (typeof obj.length != 'undefined')
        return !obj.length;
    return !obj;
}

/**
Makes an element visible by removing the 'invisible' class from the element
@param {jQuery} id - The jquery-wrapped element to make visible
*/
var makeVisible = function(id) {
    $(id).removeClass('invisible');
}

/**
Makes an element invisible by applying the 'invisible' class to the element. This sets the display as 'none'
@param {jQuery} id - The jquery-wrapped element to make invisible
*/
var makeInvisible = function(id) {
    $(id).addClass('invisible');
}


/**
Makes an element visible by removing the 'invisible' class from the element
@param {jQuery} id - The jquery-wrapped element to make visible
*/
jQuery.prototype.makeVisible = function() {
    $(this).removeClass('invisible');
    return $(this);
}


/**
Makes an element invisible by applying the 'invisible' class to the element. This sets the display as 'none'
@param {jQuery} id - The jquery-wrapped element to make invisible
*/
jQuery.prototype.makeInvisible = function() {
    $(this).addClass('invisible');
    return $(this);
}
jQuery.prototype.isVisible = function() {
    return !$(this).hasClass('invisible');
};
var setVisibility = function(id,b) {
    if (b) makeVisible(id);
    else makeInvisible(id);
}


/**
Given a string in the form 'App.Model', returns a javascript object containing two fields:
'app' - The name of the application
'model' - The name of the model

@param {string} s - The string to parse into an app and model
*/
function parseModelUri(s) {
    var parts = s.split('.');
    if (parts.length < 2) return {'app':s,'model':s};
    return {
        'app':parts[0]
        ,'model':parts.slice(1).join('.')
    };
}

/**
Given a view in the form 'app.view' or service definition in the form 'object.service', splits into an object containing
'app' - The name of the app
'view' - The name of the view
or
'object'  - The name of the object
'service' - The name of the service

@param {string} s - The string to parse into the app/view or object/service format
*/
function parseAppUri(s) {
    var parts= s.split('.');
    if (parts.length < 2) {
        return null;
    }
    var app = parts[0];
    var rest = parts.slice(1).join(".");
    return {
        'app':app
        ,'object':app
        ,'view':rest
        ,'service':rest
    };
}
var queryString = null;


/**
Returns a dictionary containing the page's query string
Optionally pass a query string key to get back that particular value

@param {string} s - The query string key for which you want to retrieve the value
*/
function QS(s) {
    if (queryString==null) {
        queryString = {};
        var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.search.substring(1);

        while (e = r.exec(q))
            queryString[d(e[1])] = d(e[2]);
    }
    if (arguments.length==0) return _.clone(queryString);
    return queryString[s];
};
var OKRegExp = /OK:(.*)/;
__PinnedObjects__ = [];
__HistoryObjects__ = [];
__Fields__ = {};
__FieldSlots__ = {};
//Maps the field id to the posted variable name
__PostFields__ = {};
__Menus__ = {};
__ServiceData__ = {};
if (typeof SDContainer == 'undefined') {
    SDContainer = {'type':'web','name':''};
    SDContainer._loaded = false;
    SDContainer._initEvents = [];
}
SDContainer.isReady = function() {
    SDContainer._loaded = true;
    $.each(SDContainer._initEvents,function(){this();});
}
SDContainer.ready = function(func) {
    if (SDContainer._loaded) func();
    else SDContainer._initEvents.push(func);
}
SDContainer.callbacks = [];
SDContainer.runCallback = function(index,opt) {
    var callback = SDContainer.callbacks[index];
    if (!!callback)
        callback(opt);
}
SDContainer.issueCommand = function(cmd,args) {
    if (SDContainer.type == 'iphone-native') {
        var url = 'sd://' + cmd;
        if (typeof(args['callback']) == 'function') {
            SDContainer.callbacks.push(args['callback']);
            args['callback'] = SDContainer.callbacks.length-1;
        }
        if (!!args && args!={})
            url += '?' + $.param(args);
        location.href = url;
        return;
    }
    if (SDContainer.type == 'web') {
        if (cmd=='upload') {
            alert('Photo uploads are not supported on this device');
        }
        return;
    }
}
__idseed__ = 0;
/** @namespace ServiceDesk */
var ServiceDesk = {


    /**
    returns the path for accessing /Apps/
    It takes the hosting type into account (full domain, subdomain, virtualdirectory) to make the url.
    The path contains a trailing '/'

    @param {string} suffix - optional parameter to append to the end of the url
    @static
    */
    appUrl: function(txt) {
        if (!txt) txt = '';
        if (__subdomain__) return __base_url__ + 'Apps/' + txt;
        return __base_url__ + __account__ + '/Apps/'+ txt;
    },
    /**
    Create a url from the base url of the application.
    It takes the hosting type into account (full domain, subdomain, virtualdirectory) to make the url.

    @param {string} suffix - optional parameter to append to the end of the url
    @static
    */
    createUrl: function(txt) {
        if (__subdomain__) return __base_url__ + txt;
        return __base_url__ + __account__  + '/' + txt;
    },

    /**
    Create a url from the root url of the application.
    It takes the hosting type into account (full domain, subdomain, virtualdirectory) to make the url.

    @param {string} suffix - optional parameter to append to the end of the url
    @static
    @static
    */
    rootUrl: function(txt) {
        ch = '';
        if (!_.startsWith(txt,'/')) ch = '/';
        if (__subdomain__) return ch +txt;
        return __base_url__ + txt;
    },

    attachmentUploadUrl: function() {
        if (__subdomain__) return __base_url__ + 'Attachments/Upload';
        return __base_url__ + __account__ + '/Attachments/Upload';
    },

    attachmentDownloadUrl: function(key) {
        if (!key) {

        if (__subdomain__) return __base_url__ + 'Attachments/Download';
        return __base_url__ + __account__ + '/Attachments/Download';
        } else {
        if (__subdomain__) return __base_url__ + 'Attachments/Download?AttachmentKey=' + key;
        return __base_url__ + __account__ + '/Attachments/Download?AttachmentKey=' + key;
        }
    },

    deviceUrl: function(x) {
        var r =  __base_url__ + "devices/" + __device__ + "/";
        if (!!x) return r + x;
        return r;
    },

    /**
    Builds a url to a specified view in an application
    @param {String} app - the application
    @param {String} view - the view
    @param {Object} [params] - Any extra query string parameters to be passed
    @static
    */
    viewUrl: function(app,view,params) {
        var qs = $.param(params||{});
        if (qs != "") qs = "?" + qs;
        var r = __base_url__ + __account__+ "/Apps/"  + app + "/" + view + qs;
        if (__subdomain__) r = __base_url__ +  "Apps/"  + app + "/" + view + qs;
        return r;
    },

    /**
    Builds a url to call make a web service call to the application.

    @param {String} app - the application that contains the service to call
    @param {String} service - the service to call
    @static
    */
    serviceUrl: function(app,service) {
        var r = __base_url__ + __account__ + '/Services/';
        if (__subdomain__) r = __base_url__ + 'Services/';
        service = service.replace(':','/');
        return r + app + '/' + service;
    },

    /**
    Builds a url starting at the current account's base url.
    @static
    */
    accountUrl: function(x) {
        x = xstr(x);
        if (__subdomain__) return __base_url__ + x;
        return __base_url__ + __account__ + '/' + x;
    },

    mapTileUrl: function() {
        var r = __base_url__ + __account__+ "/LayoutUtil/tile";
        if (__subdomain__) r = __base_url__ + 'LayoutUtil/tile';
        return r;
    },

    accountResourceUrl: function(x) {
        x = xstr(x);
        return ServiceDesk.accountUrl('AccountResources/' + x);
    },
    resourceUrl: function(x) {
        x = xstr(x);
        return ServiceDesk.accountUrl('Resources/' + x);
    },
    mapPinUrl: function() {
        var r = __base_url__ + "mapimages/";
        if (__subdomain__) r = __base_url__ + 'mapimages/';
        return r;
    },

    combineUrl: function() {
        if (arguments.length==0) return '';
        var s = [];
        for(var i=0;i<arguments.length;i++) {
            var r =  arguments[i].replace(/^\/+/g,'')
                .replace(/\/+$/g,'');
            s.push(r);
        }
        var result = s.join('/');
        return encodeURI(result);
    },


    /**
    Returns an jquery object that holds an icon for the specified application.
    @param {Object} obj
    @param {string} obj.ObjectType - specify the app name or object type name (in app.type format) for which the icon is required.
    @static
    */
    getObjectIcon: function(obj) {
        var app = obj.ObjectType;
        if (obj.ObjectType.search('\\.')>0) {
            app = parseAppUri(obj.ObjectType).app;
        }
        return $('<span />').addClass('v3-app-icon v3-app-icon-' + app.toLowerCase());

    },

    getObjectIconUrl: function(obj) {
        var app = obj.ObjectType;
        if (obj.ObjectType.search('\\.')>0) {
            app = parseAppUri(obj.ObjectType).app;
        }
        return ServiceDesk.createUrl('Resources/' + app+'/IconSmall.png');
    },

    /**
    Create a pin icon that, when clicked, adds the specified object to the clipboard

    @param {Object} object - the object to be pinned
    @param {Object} object.ObjectType - the type of the object to be pinned
    @param {Object} object.ObjectID - The textual id or name of the object - this is shown in the pinboard
    @param {Object} object.ObjectKey - the primary key of the object that will be pinned.
    */
    createPin: function(obj) {
        var sp = $('<span />').addClass('pin');
        sp.click(function(evnt){
            // evnt.stopPropagation();
            evnt.preventDefault();
            ServiceDesk.addPinnedObject(obj);
        });
        return sp;
    },

    /**
    Returns a jquery wrapped link for the given object.
    The link can be appended on the page. It can include an icon and show a qi instead of redirecting to the page

    @param {object} obj
    @param {object} obj.ObjectType - The full object type of the object in app.type format
    @param {object} obj.ObjectKey - The primary key value of the object
    @param {object} obj.ObjectID - A textual name or id that represents the object. The link will use this text.
    @param {object} [opts]
    @param {boolean} [opts.include_image=false] - Set to true if the link should show the object's icon in front of it
    @param {text} [opts.link_class=objectlink] - The css class to apply to the link. The default is 'object_link' if one was not specified.
    @param {text} [opts.view] - An alternate view page to redirect to instead of the default one which is derived based on the naming conventions for objects and views
    @param {text} [opts.app] - An alternate application to be used when deriving the view page link. This overrides the app name specified as part of the object type
    @static
    */
    createObjectLink: function(obj,opts) {
        var app = obj.ObjectType;
        var ot = obj.ObjectType;
        var view = 'view';
        if (app.search('\\.')>0) {
            var p = parseAppUri(obj.ObjectType);
            app = p.app;
            view = p.view;
        }
        var key = obj.ObjectKey;
        var include_image = opts.include_image||false;
        var cls = opts.link_class||'object_link';
        if (!!opts.qi && !opts.link_class) {
            cls = 'quickinfo object_link_qi';
        }
        view = opts.view || view;
        app = opts.app || app;
        view = view.toLowerCase();

        var href = ServiceDesk.appUrl(app+'/'+view+'?key='+key);
        if (!!opts.nolink) href = '#';
        var a = $('<a />').addClass(cls).attr('href',href);
        if (!!opts.qi) {
            a.attr('ot',app).attr('ok',obj.ObjectKey).attr('view',view+'.qi');
            if (!!opts.view) a.attr('view',opts.view+'.qi');
        }
        if (!!opts.invoke_browse) {
            $(a).click(function(evnt){
                // evnt.stopPropagation();
                evnt.preventDefault();
                ServiceDesk.loadViewInPopup(a,app,view+".browse",{'key':key},'oi');
            });
        }
        if (include_image) {
            ServiceDesk.getObjectIcon(obj).appendTo(a);
        }
        var oid = obj.ObjectID;
        if (String.matches(obj.ObjectType,'Location')) oid = ServiceDesk.contractObjectIDToText(oid);
        $('<span />').text(oid).appendTo(a);
        return a;
    },

    /**
    Dynamically loads the specified view page for the application in the background.
    Note that this function doesn't display the view. It only loads the contents for you to process.

    @param {string} app - The application from which the view is to be loaded
    @param {string} view - The actual view to load
    @param {Object} [parameters] - Any query string parameters to pass to the view
    @param {Function} [done] - A callback to be executed when the view is loaded. The callback contains the contents of the view
    @param {Function} [err] - An error handler to be called if loading the view failed. The function takes 3 parameters.
    @static
    */
    loadView: function(app,view,parameters,done,err) {
        var url = ServiceDesk.appUrl() + app + '/' + view;
        parameters = parameters || {};
        parameters['__ajax__'] = '1';
        parameters['__failonerror__'] = '1';
        ServiceDesk.fillRemoteCallParams(parameters);
        $.ajax({
            type: 'post'
            ,url: url
            ,data: parameters
            ,success: function(data) {
                if (!!done) done(data);
            }
            ,error: function(request,status,_e) {
                if (!!err) err(request.responseText);
            }
        });
    },


    /**
    Dynamically loads the specified view page for the application and inserts it at the specified jquery element.

    @param {jquery} element - The element at which the view is to be inserted
    @param {string} app - The application from which the view is to be loaded
    @param {string} view - The actual view to load
    @param {Object} [parameters] - Any query string parameters to pass to the view
    @param {Function} [done] - A callback to be executed when view has been loaded and inserted.
    @param {Function} [err] - An error handler to be called if loading the view failed. The function takes 3 parameters.
    @static
    */
    insertView: function(element,app,view,parameters,done,err) {
        var url = ServiceDesk.appUrl() + app + '/' + view;
        parameters = parameters || {};
        parameters['__ajax__'] = '1';
        parameters['__failonerror__'] = '1';
        ServiceDesk.fillRemoteCallParams(parameters);
        return $(element).load(url,parameters,function(resp,status,xhr){
                if (status=='error' ) {
                    if (!!err) err(xhr.status,xhr.statusText);
                } else {
                    if (!!done)
                        done();
                }

                });
    },


    /**
    Dynamically loads the specified url and inserts it at the specified jquery element.
    This is different from insertView in that you must specify a raw url instead of just an application name and view name.

    @param {jquery} element - The element at which the view is to be inserted
    @param {string} url - the url to be inserted.
    @param {Object} [parameters] - Any query string parameters to pass to the view
    @param {Function} [done] - A callback to be executed when view has been loaded and inserted.
    @param {Function} [err] - An error handler to be called if loading the view failed. The function takes 3 parameters.
    @static
    */
    insertContent: function(element,url,parameters,done,err) {
        parameters = parameters || {};
        parameters['__ajax__'] = '1';
        parameters['__failonerror__'] = '1';
        $(element).load(url,parameters,function(resp,status,xhr){
                if (status=='error' ) {
                    if (!!err) err(xhr.status,xhr.statusText);
                } else {
                    if (!!done)
                        done();
                }

                });
    },

    hideContainedField: function(id) {
        var elm = $$(id);
        if (elm.hasClass('use-parent-visibility')) {
            elm.parents('.field-visibility-container').first().makeInvisible();
            return true;
        }
        return false;
    },

    showContainedField: function(id) {
        var elm = $$(id);
        if (elm.hasClass('use-parent-visibility')) {
            elm.parents('.field-visibility-container').first().makeVisible();
            return true;
        }
        return false;
    },


    /**
    Perform javascript validation on a set of v3 fields.
    @param {Array} fields - a list of fields to validate
    @param {Function} ok - A function to execute if validation passed for all fields
    @param {Function} nope - A function to call if validation failed for any of the fields.
    @static
    */
    validateFields: function(fields,ok,nope) {
        errors = 0;
        for(var i=0;i<fields.length;i++) {
            var field = fields[i];
            if (field==null || field.id==null || field.type==null) continue;

            if (xstr(field.message)=='') continue;

            var f = $SD(field.id);

            if (f==null) continue;

            var validator = null;

            if (!!f.validateField) validator = function(ft){ return f.validateField(ft);};

            if (validator==null && !!f.getValue) {
                validator = function(ft) {
                    return f.getValue();
                };
            }

            if (validator==null) continue;

            if (!validator(field.type)) {
                errors++;
                ServiceDesk.signalError(field.id,field.message);
            } else {
                ServiceDesk.clearError(field.id,field.message);
            }
        }
        if (errors>0) {
            if (!!nope) nope();
        } else{
            if (!!ok) ok();
        }
        return;
    },

    /**
    Signal a validation error on the specified field.
    This causes a validation error message to be shown on the field.
    Multiple error mesasges can be shown on a single field by calling this multiple times.

    @param {String} id - the id of the field that the validation error should be shown on
    @param {String} msg - The error message to show
    @static
    */
    signalError: function(id,msg) {
        var field = ServiceDesk.getField(id);
        var elm = $$(id);
        if (!elm.exists()) return;
        var wrapper = $(elm).closest('.field-wrapper');
        if (!wrapper.exists()) return;
        wrapper.addClass('invalid');
        var msg_field = wrapper.children('.field-validation-error').filter(function(){
            return String.matches(msg,$(this).text());
        });
        if (msg_field.exists()) return;
        msg_field = $('<span />').addClass('field-validation-error').text(msg);
        wrapper.append(msg_field);
        return;
    },

    /**
    Clear a validation error message from the specified field
    @param {String} id - the id of the field to clear the error message from
    @param {String} [msg] - The message to be cleared. If specified, only that error message will be cleared
    from the field. If not specified, all error messages on that field will be cleared.
    @static
    */
    clearError: function(id,msg) {
        var field = ServiceDesk.getField(id);
        var elm = $$(id);
        if (!elm.exists()) return;
        var wrapper = $(elm).closest('.field-wrapper');
        if (!wrapper.exists()) return;
        var msgs = wrapper.children('.field-validation-error');
        if (!msg) {
            msgs.remove();
        } else {
            var fm = msgs.filter(function(){return String.matches(msg,$(this).text());});
            fm.remove();
        }
        if (!wrapper.children('.field-validation-error').exists()) {
            wrapper.removeClass('invalid');

        }
    },

    /**
    Hide the specified field. If the field is in a field list, the label will also be hidden.
    @param {String} id - the field to hide
    @static
    */
    hideField: function(id) {
        var field = ServiceDesk.getField(id);
        if (!!field) {
            if (!!field.hideField) {
                field.hideField();
                return;
            }
        }
        if (ServiceDesk.hideContainedField(id)) return;

        makeInvisible('#' + id);
        makeInvisible('#' + id + "__footer");
    },

    /**
    Show the specified field that was previously hidden.
    @param {String} id - the field to be shown
    @static
    */
    showField: function(id) {
        var field = ServiceDesk.getField(id);
        if (!!field) {
            if (!!field.showField) {
                field.showField();
                return;
            }
        }
        if (ServiceDesk.showContainedField(id)) return;

        makeVisible('#' + id);
        makeVisible('#' + id + "__footer");
    }
    ,setFieldSlot: function(id,slotid,obj) {
        var slot = __FieldSlots__[id];
        if (!slot) __FieldSlots__[id] = {};
        __FieldSlots__[id][slotid] = obj;
    }
    ,getFieldSlot: function(id,slotid) {
        var obj = __FieldSlots__[id];
        if (!obj) return null;
        return obj[slotid] || null;
    },

    /**
    Gets the 'value' of the specified field.
    The value could mean different things depending on the actual field.
    @param {String} id - the id of the field to retrieve the value of
    */
    getFieldValue: function(id) {
        if (!__Fields__[id]) return null;
        if (!__Fields__[id].getValue) return null;
        return __Fields__[id].getValue();
    },

    /**
    Sets up a callback to return parameters for a field.
    Only works on certain fields like dynamiclists and celllists which need to request for parameters
    for passing to a search filter.

    @param {String} id - the id of the field to set the callback for
    @param {Function} callback - the function to be executed to supply parameters
    */
    parametersRequired: function(id,func) {
        if (
            !!func
            && !!(__Fields__[id])
            && !!(__Fields__[id].parametersRequired)
            )
            __Fields__[id].parametersRequired(func);
    },

    showPinQuickInfo: function(ctrl,obj,ot,otlabel,cb) {
        /* ctrl that originated the event - to set the bubble position
         * obj- an object that can be pinned. will cause the 'Pin this object' link to appear
         * ot - an objecttype to filter by and show
         * cb - a callback to invoke when a pinned-object is selected
         */
        var bubble = ServiceDesk.showBubble(ctrl,'pinbubble');
        var content = bubble.content;
        if (ot!="") {
            var pins = ServiceDesk.getPinnedObjects(ot);
            if (pins.length>0) {
                var pl = pins.length;
                for(var i=pl-1;i>=0;i--) (function(){
                    var pin = pins[i];
                    var lnk = $('<a />')
                    .attr('href','#')
                    .text(pin.ObjectID)
                    .addClass('pinned_object')
                    .css('display','block')
                    .click(function(evnt){
                        evnt.preventDefault();
                        cb(pin);
                        ServiceDesk.hideBubble(bubble.control);
                    });
                    var icon = ServiceDesk.getObjectIcon(pin);
                    lnk.prepend(icon);
                    content.append(lnk);
                })();
            } else {
                var ot_name = otlabel || ot;
                /*var msg = 'No pinned ' + ot_name + ' objects are available';
                if (ot=='*') msg = 'No pinned objects are available';*/
                var msg = $L('sys.pinboard-no-items');
                content.append($('<div class="nodata"/>').text(msg));
            }

        }
        ServiceDesk.adjustBubble(bubble);
    },

    /**
    Register a callback to be called when a given field is 'saved'.
    This is normally used with fieleditors or groupeditors to detect when they get saved and run some code.

    @param {String} id - the field to listen to for save events
    @param {Function} func - the callback to execute when that field gets saved.
    @static
    */
    onFieldSaved: function(id,func) {
        var event = id + ':field.saved';
        $(ServiceDesk).bind(event,func);
    },
    _registeredChanges : {},

    /**
    Setup a callback to be called whenever a given field has a value changed by the user
    @param {String} id - the id of the field to listen to for changes
    @param {Function} func - the callback to execute when the field's value changes
    @static
    */
    registerFieldChange: function(id,func) {
        if (!ServiceDesk._registeredChanges[id]) ServiceDesk._registeredChanges[id] = [];
        if (_.indexOf(ServiceDesk._registeredChanges[id],func)<0)
            ServiceDesk._registeredChanges[id].push(func)
        if (!__Fields__[id]) return null;
        if (!__Fields__[id].registerChangeEvent) return null;
        __Fields__[id].registerChangeEvent(func);

    },

    /**
    This function is used to rebind field change callbacks.
    When fields are updated, they may lose their event bindings. This will re-register any change events that
    were previously registered for a field.
    Note: You should never have to use this except as a work-around for some bug in the FW.
    @static
    @private
    */
    fieldsUpdated: function() {
        _.defer(function(){
            _.each(ServiceDesk._registeredChanges,function(funcs,id) {
                if (!__Fields__[id]) return;
                if (!__Fields__[id].registerChangeEvent) return;
                _.each(funcs,function(func){
                    __Fields__[id].registerChangeEvent(func);
                });
            });
        });
    },
    fieldUpdated: function(id,opts) {
        if (!!__Fields__[id]
        && !!__Fields__[id].fieldUpdated)
        __Fields__[id].fieldUpdated(opts);
    },


    /**
    Return a field object for the field with the specified id
    @static
    @param {String} id - the id of the field to retrieve
    */
    getField: function(id) {
        if (!__Fields__[id]) return null;
        return __Fields__[id];
    },


    /**
    Returns the first field that has the specified tag (ie, data-iviva-tag in html)
    @static
    @param {String} tag - the tag for the field to be retrieved
    */
    getFieldByTag: function(tag) {
        var x = $('*[data-iviva-tag="'+tag + '"').attr('id');
        return ServiceDesk.getField(x);
    },

    /**
    Returns a list of  fields that has the specified tag (ie, data-iviva-tag in html)
    @static
    @param {String} tag - the tag for the field to be retrieved
    @param {jquery} [parent] - An optional jquery element  to scope the search in
    */
    getFieldsByTag: function(tag,parent) {
        var items = [];
        var fields= [];
        var expr = '*[data-iviva-tag="'+tag + '"';
        if (!!parent) {
            fields = $(parent).find(expr);
        } else {
            fields = $(expr);
        }
        fields.each(function(){
            var id = $(this).attr('id');
            if (!!id) {
                var field = ServiceDesk.getField(id);
                if (!!field) {
                    items.push(field);
                }

            }
        });

        return items;
    },

    /**
    Returns a list of  field ids that has the specified tag (ie, data-iviva-tag in html)
    @static
    @param {String} tag - the tag for the field to be retrieved
    */
    getFieldIDsByTag: function(tag) {
        var items = [];
        $('*[data-iviva-tag="'+tag + '"').each(function(){
            var id = $(this).attr('id');
            if (!!id) {
                items.push(id);
            }
        });

        return items;
    },


    /**
    Return the first field that begins with the specified id
    @static
    @param {String} id - the prefix of the field to be retrieved
    */
    getFieldByPrefix: function(id) {
        var results = [];
        _.forEach(__Fields__,function(v,k) {
            if (_.startsWith(k,id))
                results.push(v);
        });
        return results[0]|| null;
    },
    /**
    @name ServiceCallback
    @static
    @function
    @param {Object[]} data - data that was returned from the service call
    */
    /**
    @name ServiceError
    @static
    @function
    @param {String} error - The error message that was returned from the service call on failed execution
    */

    /**
    Execute a  model action. This internally calls {@link ServiceDesk#executeService} with the right parameters
    @static
    @param {String} ot - object type of the model
    @param {String} action - model action to be called
    @param {Object} params - query string parameters
    @param {ServiceCallback}  ok - function to call after the service executes
    @param {ServiceError}  err - error handler to call if service execution failed
    */
    executeModelAction: function(ot,action,params,ok,err) {
        var a = parseModelUri(ot);
        return ServiceDesk.executeService(a.app,a.model+":"+action,params,ok,err);
    },



    /**
    Executes a web service call to the backend.
    @static
    @param {String} app - The application that contains the service to call
    @param {String} service - The service name
    @param {Object} params - query string parameters
    @param {ServiceCallback}  ok - function to call after the service executes
    @param {ServiceError}  err - error handler to call if service execution failed
    */
    executeService: function(app,service,params,ok,err) {
        service = service.replace(':','/');
        var url = ServiceDesk.serviceUrl(app,service);
        params['__ajax__'] = '1';
        params['__format__'] = 'json';
        params['__sc__'] = __token__||'';
        ServiceDesk.fillRemoteCallParams(params);
        $.ajax({
            type: 'post'
            ,url: url
            ,data: params
            ,dataType: 'json'
            ,success: function(data) {
                if (!!ok) ok(data);
                if (!params.__nobpmcheck__) ServiceDesk.checkBPMStage();
            }
            ,error: function(request,status,_e) {
                // for 'dataType: json', jQuery 1.9.1 now returns an error
                // if response is empty
                //
                // "json": (...)The JSON data is parsed in a strict manner; any malformed JSON is rejected and a parse error is thrown. As of jQuery 1.9, an empty response is also rejected; the server should return a response of null or {} instead.(...)
                //
                // WORKAROUND
                //
                // https://stackoverflow.com/questions/14468704/what-changed-in-jquery-1-9-to-cause-a-ajax-call-to-fail-with-syntax-error
                if (request.status >= 200 && request.status < 300) {
                    if (!!ok) ok(null);
                    if (!params.__nobpmcheck__) ServiceDesk.checkBPMStage();

                    return;
                }

                var error_obj = {};
                var exp_type = request.getResponseHeader('X-IVIVA-EXCEPTION');
                var msg= request.responseText;
                if (!!exp_type) {
                    if (exp_type == 'SDModelValidationException') {
                        var eo = {};
                        try {
                            eo = JSON.parse(request.responseText);
                        } catch(e) {

                        }
                        error_obj.type = exp_type;
                        error_obj.attribute = eo.attribute;
                        error_obj.message = eo.message;
                        if (!!error_obj.message) msg = error_obj.message;
                    }
                }
                if (!!err) err(msg,request,error_obj);
            }
                });
    },

    /**
    Get any callback function associated with the closing of a dialog or popup.
    @static
    @param {jquery} ctrl - Any element inside the dialog or popup.
    */
    getContainerCallback: function(ctrl) {
        var container = $(ctrl).parents('.remote_form_container');
        if (!container.exists()) container = $(ctrl).parents('.modal_popup_container');
        return $(container).data('callback');
    },


    /**
    Execute any callback associated with the closing of a dialog or popup
    @static
    @param {jquery} ctrl - Any element inside the dialog or popup.
    */
    executeContainerCallback: function(ctrl) {
        var field = $SD(ctrl);
        if (!!field && !!field.getFieldContainer) ctrl = field.getFieldContainer();
        var cb = ServiceDesk.getContainerCallback(ctrl);
        if (!!cb) cb();
    },


    /**
    Submit a data entry dialog/view to the server. Unlike executing a web service call,
    this will perform validation on fields and return the html for the dialog (with  errors marked)
    incase validation failed. On success, the dialog's closing callback will be executed.
    @static

    @param {jquery} ctrl - The element that was clicked on to call this function.
    Passing a value for this will allow that element to show a 'loading...' animation while the execution takes place.
    @param {String} app - the application that contains the dialog view being submitted
    @param {String} view - the view being submitted
    @param {String} action - the action that was clicked on when submitting the form. Must be the id of a  registered action field in the view
    @param {String[]} fields - an array containing the ids of fields that should be posted and validated
    */
    executeModalViewActionInBackground:function(ctrl,app,view,action,fields) {
        var field_list = fields.split(',');
        var background_action = action;
        var container = $(ctrl).parents('.remote_form_container');
        if (!container.exists()) container = $(ctrl).parents('.modal_popup_container');
        var p = container.data('remote_params') || QS();
        var field_vals = ServiceDesk.gatherFields(field_list);
        _.extend(p,field_vals);
        var xbase = '';
        for(var i=0;i<field_list.length;i++) {
            xbase = ServiceDesk.extractScopeBase(field_list[i]);
            if (xbase != '') break;
        }
        if (!!xbase) p['__xbase__'] = xbase;
        var loader = $('<div />').addClass('loading_small').css('display','inline-block');
        var disp = $(ctrl).css('display');
        var show_action = function() {
            $(ctrl).css('display',disp);
        }
        var hide_action = function() {
            $(ctrl).css('display','none');
        }

        var invoked_ctrl = $(ctrl).get(0);

        if (!!invoked_ctrl) {
            if (invoked_ctrl.nodeName == 'BUTTON' || invoked_ctrl.nodeName == 'INPUT') {
                hide_action = function() {
                    $(ctrl).attr('disabled','disabled');
                }
                show_action = function() {
                    $(ctrl).removeAttr('disabled');
                }
            }
        }
        loader.insertAfter($(ctrl));
        hide_action();
        ServiceDesk.executeViewAction(app,view,action,p
        ,function(validated,page) {
            //var container = $(ctrl).parents('.modal_popup_container');
            //if (container.length==0) return;
            show_action();
            loader.remove();
            if (container.length==0) return;
            if (!validated) {
                $(container).html(page);
            } else {
                var cb = $(container).data('callback');
                if (!!cb) cb(page,background_action);
            }
        }
        ,function(txt) {
            alert('Error: ' + txt);
            loader.remove();
            show_action();
        });
    },

    /**
    Inserts an application's view at a specific element on the page.
    Unlike {@link ServiceDesk#insertView}, this function can be used to dynamically load a data entry form which can be submitted.

    @static
    @param {jquery} ctrl - the element where the view will be inserted
    Can be empty
    @param {String} app - the application containing the view to be shown
    @param {String} view - the view to be shown
    @params {Object} params - any query string parameters to be passed when loading the dialog
    @params {Function} submit_cb - a function to call when the dialog is saved
    @params {Function} cg_cb - a function to be called after the dialog is loaded
    @params {Function} err - a function to be called if any error ocurred while loading the dialog
    */
    loadRemoteForm: function(ctrl,app,view,params,submit_cb,cg_cb,err) {
        var remote_params = _.clone(params);
        ServiceDesk.insertView(ctrl,app,view,params,function(){
            $(ctrl).addClass('remote_form_container');
            $(ctrl).data('remote_params',remote_params);
            $(ctrl).data('callback',submit_cb);
            if (!!cg_cb) cg_cb();
        },err);
    }
    ,executeFieldUpdate: function(opts) {
        var app = opts.app;
        var view = opts.view;
        var field= opts.field;
        var params = opts.params;
        var ok = opts.onSuccess;
        var err = opts.onError;
        var fin = opts.onCompleted;
        var url = ServiceDesk.appUrl() + app + '/' + view ;
        params['__field__'] = field;
        params['__mode__']= 'fieldupdate';
        params['__sc__'] = __token__||'';
        var xb = ServiceDesk.extractScopeBase(field);
        if (!!xb)   {
            url = ServiceDesk.addQueryString(url,{'__xbase__':xb});
        }
        ServiceDesk.fillRemoteCallParams(params);
        $.ajax({
            type: "post"
            ,url: url
            ,data: params
            ,success: function (data) {
                if (!!ok) ok(data);
                if (!!fin) fin();
                if (!params.__nobpmcheck__) ServiceDesk.checkBPMStage();

            }
            ,error: function(request,status,_e) {
                //alert(request.getAllResponseHeaders());
                if (!!err) err(request.responseText,request.getResponseHeader('content-type'));
                if (!!fin) fin();
            }
                });
    }
    ,checkBPMStage: function() {
        var check_stage_timer = ServiceDesk.__bpmstagetimer__;

        if (!!check_stage_timer) {
            clearTimeout(check_stage_timer);
        }

        ServiceDesk.__bpmstagetimer__ = setTimeout(ServiceDesk.validateBPMStage,3000);
    }
    ,validateBPMStage: function() {
        if (!ServiceDesk.BPMKey) return;
        if (!ServiceDesk.BPMType) return;
        ServiceDesk.__bpmstagetimer__ = null;
        ServiceDesk.executeModelAction(ServiceDesk.BPMType,'Stage',{'key':ServiceDesk.BPMKey,__nobpmcheck__:true},function(data) {
            if (data.length==0) {
                console.log('No process for this object');
                return;
            }
            var status = xstr(data[0]['Stage']);

            if (status=='') return;

            if (status.toUpperCase() != xstr(ServiceDesk.BPMStage).toUpperCase()) {
                ServiceDesk.showBPMStageChangeMessage(status);
                $(ServiceDesk).trigger('process.statechange',[status]);
            } else {
                if (!ServiceDesk.__bpmstagetimer__) {
                    ServiceDesk.__bpmstagetimer__ = setTimeout(ServiceDesk.validateBPMStage,60000);
                }
            }
        },function(err){
            console.log('Error getting bpm stage',arguments);
        })
    }
    ,showBPMStageChangeMessage: function(status) {
        let msg = $L('sys.bpm-stage-changed');
        var reloadMsg = $L('sys.bpm-stage-changed-reload');
        $('.processmessage').html(
            '<div>'+msg+': <i>' + status + '</i> <b><a href="#" class="actionlink" onclick="location.reload(true);return true;">'+reloadMsg+'</a></b></div>'
            );
        $('.processmessage').makeVisible();
    }
    ,fillBPMParams: function(params) {
        if (!!params.__bpmot__) return params;
        if (!!params.__bpmok__) return params;
        if (!!params.__bpmstage__) return params;
        if (!!ServiceDesk.BPMStage && !!ServiceDesk.BPMType && !!ServiceDesk.BPMKey) {
            params.__bpmot__ = ServiceDesk.BPMType;
            params.__bpmok__ = ServiceDesk.BPMKey;
            params.__bpmstage__ = ServiceDesk.BPMStage;
        }
        return params;
    }
    ,fillRemoteCallParams : function(params) {
        if (!!__device__)
            params['__device__'] = __device__;
        ServiceDesk.fillBPMParams(params);
    }
    ,executeViewAction: function(app,view,action,params,ok,err,fin) {
        var url = ServiceDesk.appUrl() + app + '/' + view ;
        params['__action__' + action] = '1';
        params['__statusredirect__'] = '1';
        params['__ajax__'] = '1';
        params['__failonerror__'] = '1';
        params['__sc__'] = __token__||'';
        ServiceDesk.fillRemoteCallParams(params);
        $.ajax({
            type: "post"
            ,url: url
            ,data: params
            ,success: function (data) {
                var validated = false;
                if (data.search(OKRegExp)==0) {
                    var parts = data.match(OKRegExp);
                    if (parts.length==2) {
                        validated = true;
                        data = parts[1];
                    }
                }
                if (!!ok) ok(validated,data);
                if (!!fin) fin();
                if (!params.__nobpmcheck__) ServiceDesk.checkBPMStage();

            }
            ,error: function(request,status,_e) {
                if (!!err) err(request.responseText);
                if (!!fin) fin();
            }
                });
    }
    ,closeCurrentPopup: function(control) {
        var p = $(control).parents('.modal');
        ServiceDesk.closePopup(p)
    }
    ,closeAllPopups: function() {
        $('.modal').makeInvisible();
        $$('__popupoverlay__').makeInvisible();
    }
    ,closePopup: function(id) {
        ServiceDesk.closeAllPopups();
        return;
    }
    ,gatherFieldValues: function(field,prefix,params) {
        if (!__Fields__[field]) return;

        if (!!__Fields__[field].gatherFields) {
            __Fields__[field].gatherFields(params,prefix);
            return;
        }

        params[prefix] = __Fields__[field].getValue();

    }
    ,gatherFields: function(fields) {
        var p = {};
        $(fields).each(function(){
            if (!__Fields__[this]) return;
            if (!!__Fields__[this].gatherPostFields) {
                __Fields__[this].gatherPostFields(p);
            } else {
                var v = ServiceDesk.getFieldValue(this);
                var n = this;
                if (!!__PostFields__[this]) n = __PostFields__[this];
                p[n] = v;
            }
        });
        for(var i=0;i<fields.length;i++) {
            var field = fields[i];
        }
        return p;
    }
    ,getEmptyLayer: function(seed,opts) {
        opts = opts || {};
        if (!seed) seed = "";
        seed= seed.replace(/[#.]/g,'_');
        seed= seed.replace(/[!]/g,'_');
        var empty_id = '__default_layer__' + seed;
        var extra_css = '';
        if (!!opts && !!opts.stretch) extra_css = 'stretch';
        var x = $$(empty_id);
        if (!x || x.length==0) {
            var layer = $('<div />').addClass('modal_layer ' + extra_css).attr('id',empty_id);
            if (!!opts.css) {
                layer.attr('style',opts.css);
            }
            $('<div />').addClass('content').appendTo(layer);
            $(document.body).append(layer);
        }
        x = $$(empty_id);
        x.makeInvisible();
        $('.content',x).empty();
        var lm = '__layer_mask__';
        var mask = $$(lm);
        if (!mask || mask.length==0) {
            mask = $('<div />').addClass('layer_mask').attr('id',lm);
            mask.makeInvisible();
            $(document.body).append(mask);
            mask.click(function(e){
                e.preventDefault();
                if (!!mask.data('can_click_to_close'))
                    ServiceDesk.closeLayers();
            });
        }
        return x;
    }
    ,showLayerMask: function(can_click_to_close) {
        var w = $(document).width();
        var h = $(document).height();
        var lm = $$('__layer_mask__');
        lm.makeVisible().width(w).height(h);
        if (can_click_to_close==null) can_click_to_close = true;
        lm.data('can_click_to_close',can_click_to_close);
    }
    ,showPopupOverlay: function() {
        var x = $$('__popupoverlay__');
        if (!x.exists()) {
            x = $('<div />').attr('id','__popupoverlay__');
            x.makeInvisible();
            $(document.body).append(x);
        }
        var w = $(document).width();
        var h = $(document).height();
        x.makeVisible().width(w).height(h);
    }
    ,hideLayerMask: function() {
        $$('__layer_mask__').makeInvisible();
    }
    ,hideLayers: function() {
        $('.modal_layer').makeInvisible();
        ServiceDesk.hideLayerMask();
    }
    ,closeLayers: function() {
        $('.modal_layer').makeInvisible();
        $('.modal_layer').each(function(){
            var x = $(this);
            if (x.attr('hidelayer')=='1') return;
            x.remove();
        });
        $(ServiceDesk).trigger('layersClosed');
        ServiceDesk.hideLayerMask();
    }
    ,getEmptyPopup: function(seed,opts) {
        opts = opts || {};
        if (!seed) seed = "";
        seed= seed.replace(/[#.]/g,'_');
        var empty_id = '__default_popup__' + seed;
        var x = $$(empty_id);
        if (!x || x.length==0) {
            var popup = $('<div />').addClass('modal').attr('id',empty_id);
            if (!!opts.stretch) popup.addClass('stretch');
            popup.append($('<div />').addClass('modal_container')
            .append(
                $('<div />').addClass('popup_content')
            )
            );
            var closer = $('<a />').addClass('popup_close');
            closer.click(function(evnt){
                evnt.preventDefault();
                ServiceDesk.closePopup(x);
            });
            popup.append(closer);
            $(document.body).append(popup);
        }
        x = $$(empty_id);
        opts = opts || {};
        if (!!opts.css) {
            x.attr('style',opts.css);
        }
        x.find('.popup_content').empty();
        return x;
    }

    ,loadContentInPopup: function(control,content_generator,seed_id,opts) {
        var x = ServiceDesk.getEmptyPopup(seed_id,opts);
        var c = $('.popup_content',x);
        ServiceDesk.showPopupOverlay();
        makeVisible(x);
        c.html('<div class="emptypopup loader-small"></div>');
        // setTimeout(function(){content_generator(c);},1000);
        content_generator(c);
        $(x).center({mobilePos:'top'});
        ServiceDesk.closeMenus();
    }
    ,loadViewInPopup: function(control,app,view,params,seed_id,callback,opts) {
        this.loadContentInPopup(control,function(c){
            $(c).addClass('modal_popup_container');
            if (!!callback) callback($(c));
            var _p = params;
            if (typeof params != 'function')
                _p = function(){return params;};

            var _app = app;
            var _view = view;
            if (typeof app == 'function') _app = app();
            if (typeof view == 'function') _view = view();

            ServiceDesk.insertView(c,_app,_view,_p(),function(){ },function(stat,txt) {
                    console.log('Error:' + stat + ':' + txt);
                    var msg = txt;
                    if (!msg) msg = 'No content was returned';
                    c.html('<div class="popuperror"><div class="error">Error:' + msg + '</div></div>');
                });
        },seed_id,opts);
    }
    ,loadSearchListInPopup: function(control,app,view,params,select_handler) {
        var slid = $(control);
        ServiceDesk.loadViewInPopup(control,app,view,params,app+view,function(c){
            $(c).addClass('sl_modal_container').attr('slid',slid);
        });
        ServiceDesk.registerItemSelectionCallback(slid,function(id,data){
            if (!!select_handler(data,control))
                ServiceDesk.closePopup(control);
        });
    }
    ,loadFormViewInPopup: function(control,app,view,params,seed_id,callback) {
        return ServiceDesk.loadViewInPopup(control,app,view,params,seed_id,function(c){
            if (!!callback)
                $(c).data('callback',callback);
        });
    },
    /**
    Load and display an application view as a popup dialog.

    @static
    @param {jquery} ctrl - the element where the view will be inserted
    Can be empty
    @param {String} app - the application containing the view to be shown
    @param {String} view - the view to be shown
    @params {Object} params - any query string parameters to be passed when loading the dialog
    @params {Function} callback - a function to call when the dialog is saved
    @params {Object} [opts] - additional options
    @param {Boolean} [opts.prevent_layer_closure=false] - If false, the dialog can be closed by clicking outside it.
    If set to true, the user has to explicitly submit the dialog or press the close button on it to close it.
    @param {Boolean} [opts.stretch=false] - If true, the dialog is stretched out to occupy most of the window's width
    @param {String} opts.css - Any additional css rules to apply to the dialog window
    @param {Function} opts.loaded - Any function to call after the view is loaded
    @param {Function} opts.finished - Any function to call after the view is loaded. Also called if an error occurred.

    */
    loadRemoteFormInLayer: function(app,view,params,callback,opts) {
        opts = opts || {};
        var seed_id = app+"_" + view;
        var layer = ServiceDesk.getEmptyLayer(seed_id,opts);
        //makeVisible(layer);
        var prevent_layer_closure = false;
        if (!!opts) prevent_layer_closure = !!opts.prevent_layer_closure;
        ServiceDesk.showLayerMask(!prevent_layer_closure);
        var content_generator = function(c) {
            ServiceDesk.loadRemoteForm(c,app,view,params,function(data,action){
                if (!!callback) callback(data,action);
            },function(){
                makeVisible(layer);
                layer.center({mobilePos:'top'});
                if (!!opts.loaded) opts.loaded();
                if (!!opts.finished) opts.finished();
            },function(s,txt) {
                alert('Error: ' + s + ":" + txt);
                if (!!opts.finished) opts.finished();
            });
        };
        content_generator($('.content',layer));
        ServiceDesk.closeMenus();
        return;
    },

    /**
    Close the current dialog box
    @param {jquery} ctrl - Any element within the dialog that needs to be closed
    @static
    */
    closeCurrentLayer: function(ctrl) {
        var layer = $(ctrl).closest('.modal_layer');
        layer.makeInvisible();
        layer.find('.content').empty();
        ServiceDesk.hideLayerMask();
    }
    ,showPopupAtElement: function(id,control,alignment) {
        //EDITTHIS
        makeVisible($('#'+id));
        var x = $$(id);
        $(x).center();

        ServiceDesk.closeMenus();
        return;
    }
    ,showPopupAtPos: function(id,pos,alignment) {
        var popup = $$(id);
        if (alignment == 'left') {
            pos.left = pos.left - popup.width() + pos.width;
        }
        popup.css('left',pos.left);
        popup.css('top',pos.top);
        makeVisible(popup);
        popup.css('display','block');
    }
    ,hideBubble: function(bubble) {
        $(bubble).css('visibility','hidden');
        var sheet = ServiceDesk.getBubbleBackground();
        sheet.makeInvisible();
    },


    hideBubbleSheet: function() {
        var sheet = ServiceDesk.getBubbleBackground();
        sheet.makeInvisible();
    },

    /**
    Hide a specific bubble based on an element within it
    @param {jquery} ctrl - An element within the bubble that is going to be closed.
    @static
    */
    hideCurrentBubble: function(ctrl) {
        ServiceDesk.hideBubble($(ctrl).closest('.bubble'));
    },

    /**
    Hide all open bubbles
    @static
    */
    hideBubbles: function(ctrl,originator) {
        var parent_bubble = $(originator).closest('.bubble').get(0);
        if ($(originator).hasClass('hidebubble')) parent_bubble = null;
        var bubbles = $('.bubble').filter(function(){
            return this != parent_bubble;
        });
        bubbles.css('visibility','hidden');
        if (!!ctrl && !!ctrl.data('bubble')) {
            ctrl.data('bubble').css('visibility','visible');
        }
    },
    /**
    Show content in a quick info bubble.
    @param {jquery} ctrl - Show the bubble near this element. This is typically the anchor tag that was clicked on.
    @param {jquery} content - The content to be shown. The content is removed from its previous location and appended into the bubble.
    @param {Function} [opts.adjust] - If set to true, adjust the bubble position according to the screen dimensions so that it fits neatly in the screen
    @static
    */
    showAsBubble: function(ctrl,content,opts) {
        var sheet = ServiceDesk.getBubbleBackground();
        sheet.makeVisible();
        var opts = opts || {};
        _.defer(function(){
            $(sheet).append(content);
            $(content).addClass('bubble');
            ServiceDesk._addQIPointer(content);
            ServiceDesk._setQIDirection(ctrl,content);
            content.css('visibility','');
            if (!!opts.adjust) {
                ServiceDesk.adjustBubble({control:ctrl,content:content.children().first()});
            }
        });
    }
    ,_addQIPointer: function(ctrl) {
        var pointer = ctrl.find('.pointer');
        if (!pointer.exists()) {
            ctrl.append($('<div />').addClass('pointer'));
        }
        return ctrl.find('.pointer');
    }

    /* Set the direction of the QI pointer */
    ,_setQIDirection: function(ctrl,qi_ctrl) {
        var e = $(ctrl);
        if (
            (!e.exists() || !e.get(0) || !e.get(0).nodeName )
            && (!!ctrl.left && !!ctrl.top)) {
            e = simulateElement(ctrl);
        }

        var pointer = qi_ctrl.find('.pointer');

        /* Clear any previous top value set to the pointer */
        pointer.css('top','');

        pointer.addClass('pointer_l');
        qi_ctrl.data('source',e);
        var content = qi_ctrl.find('.content');
        var pos = e.offset();
        var m = qi_ctrl.parent().offset();
        pos.left -= m.left;pos.top -= m.top;
        var w = $(window).width();
        if (w - (pos.left + e.width()) < w*0.4) {
            var r = w - (pos.left - 0);
            var t = pos.top + e.height()*0.5
            pointer.removeClass('pointer_l');
            pointer.addClass('pointer_r');
            qi_ctrl.css({
                'right':r+'px'
                ,'top':pos.top + 'px'
                ,'left':''
            });
        } else {
            pos.left += e.width()+30;
            pos.top += e.height()*0.5 - 15;
            pointer.removeClass('pointer_r');
            pointer.addClass('pointer_l');
            qi_ctrl.css({
                'left':pos.left+'px'
                ,'top':pos.top+'px'
                ,'right':''
            });
        }

    },

    getBubbleBackground: function() {
        var e = $('.bubble-sheet');
        if (!e.exists()) {
            e = $('<div />');
            e.addClass('bubble-sheet');
            $('body').append(e);
            e.touchClick(function(evnt){
                var src = evnt.srcElement || evnt.target;
                if (!$(src).hasClass('bubble-sheet')) return;
                console.log(evnt);
                evnt.preventDefault();
                evnt.stopPropagation();
                e.makeInvisible();
                $('.guider').css('visibility','hidden');
            });
        }
        return e;
    },

    /**
    @class
    @name QIBubble
    @property {jquery} control - The element that represents the bubble
    @property {jquery} content - The element within the bubble where the actual content should go
    */
    /**
    Generate a bubble on the page and return it so content can be loaded into it.
    Since this is typically called on clicking an element and clicks on the page usually cause all bubbles to close,
    you should wrap the call to this in _.defer() to cause it to execute after the click finishes.

    @param {jquery} ctrl - The element near which the bubble is to be shown
    @param {String} [klass] - Any additional css classes to be applied to the bubble.
    @returns {QIBubble}
    @static
    */
    showBubble: function(ctrl,klass) {
        var sheet = ServiceDesk.getBubbleBackground();
        sheet.makeVisible();

        var qi_ctrl = $('.' + klass);
        if (!qi_ctrl.exists()) {
            qi_ctrl = $('<div />').addClass(klass).addClass('bubble');
            qi_ctrl.append($('<div />').addClass('pointer'));
            qi_ctrl.append($('<div />').addClass('content'));
            qi_ctrl.css('visibility','hidden');
            sheet.append(qi_ctrl);
            // $('body').append(qi_ctrl);
        }
        qi_ctrl = $(qi_ctrl.get(0));
        var content = qi_ctrl.find('.content');

        if (isMobileWidth()) {

            qi_ctrl.css('visibility','');
            qi_ctrl.find('.pointer').makeInvisible();
            _.defer(function(){
                qi_ctrl.css({
                    left:'0px'
                    ,bottom:'-100%'
                    // ,bottom: -qi_ctrl.height()
                });
                qi_ctrl.animate({'bottom':0});
            });

            // qi_ctrl.css({
            //     left:'0px'
            //     ,bottom: '0px'
            // });
            // qi_ctrl.css('visibility','');

        } else {
            ServiceDesk._setQIDirection(ctrl,qi_ctrl);
            qi_ctrl.css('visibility','');
        }

        content.html(' ');
        return {control:qi_ctrl,content:content};
    },

    /**
    Re-adjusts the position of a bubble after content has been added.
    The bubble is adjusted so that it fits on screen.
    Only vertical adjustment is done
    @param {QIBubble} bubble - the bubble to be adjusted.
    @static
    */
    adjustBubble: function(bubble) {

        if (isMobileWidth()) return;

        var ctrl = bubble.control;
        var content = bubble.content.parents('.bubble');

        var pos = content.offset();
        var contentHeight = content.outerHeight();
        var contentBottom = pos.top + contentHeight;

        var winTop = $(window).scrollTop();
        var winHeight = $(window).height();
        var winBottom = winTop + winHeight;

        /* Gone too much below. Try to raise it */
        if (winBottom - contentBottom < 0) {

            /*Bubble is too big to fit in the window, so just give up */
            if (contentHeight >= winHeight) {
                return;
            }
            var moveUp = contentBottom - winBottom;
            var top = content.position().top;
            content.css('top',top - moveUp);

            var pointer = content.find('.pointer');
            var pointerPos = pointer.position();

            pointer.css('top',pointerPos.top + moveUp);
        }
    },

    /**
    @class AppView
    @property {String} app - the application name
    @property {String} view - the view name
    */
    /**
    Given an object type, return the application and view representing the quick info view for that object type
    @param {String} ot - the object type
    @returns {AppView}
    @static
    */
    getQIUri: function(ot,ok) {
        if (typeof ot=='string') {
            app = ot;
            view = 'view.qi';
            if (app.search('\\.')>0)  {
                var _p = parseAppUri(app);
                app = _p.app;
                view = _p.view.toLowerCase() + '.qi';
            }
        } else {
            app = ot.app;
            view = ot.view;
        }
        return {'app':app,'view':view};

    },

    /**
    Show an object's quick info bubble near a specific element.
    Since this is typically called on clicks and clicks usually cause bubbles to be hidden,
    it is possible that the bubble will be hidden as soon as it is invoked.
    To prevent this, wrap the call to this in _.defer().
    @param {jquery} ctrl - the element near which the bubble should be shown
    @param {String} ot - the object type of the object
    @param {String} ok - the object key of the object
    @param {Function} cb - A callback to be called once the bubble is loaded. This function will be passed as an argument the jquery wrapped element
    of the bubble's content.
    @static
    */
    showQuickInfo: function(ctrl,ot,ok,cb) {
        uri = ServiceDesk.getQIUri(ot,ok);
        var app = uri.app;
        var view = uri.view;
        return ServiceDesk.showQuickInfoWithView(ctrl,app,view,{'key':ok},cb);
    },
    showQuickInfoForListItem: function(ctrl,ot) {
        var  md = ServiceDesk.getElementMetaData(ctrl);
        var ok = md.ObjectKey;
        return _.defer(function(){ServiceDesk.showQuickInfo(ctrl,ot,ok);});
    },

    /**
    Similar to ServiceDesk#showQuickInfoWithView but wraps the call in a _.defer().
    @static
    */
    loadViewInQuickInfo: function() {
        var self = this;
        var args = arguments;
        _.defer(function(){
            ServiceDesk.showQuickInfoWithView.apply(self,args);
        });
    },


    /**
    Loads a given view into a quick info bubble and shows it near the specified element
    @param {jquery} ctrl - the element near which the bubble should be shown
    @param {String} app - The app from which the view is to be loaded
    @param {String} view - The view to be shown
    @param {Object} params - Any query string parameters to pass to the view
    @param {Function} [cb] - Any function to be called after the bubble is loaded. The bubble's content element is passed as a parameter to this function
    @param {String} [bubble_type=qibubble] - The type of bubble to show - this is set as a css class on the bubble.
    @static
    */
    showQuickInfoWithView: function(ctrl,app,view,params,cb,bubble_type) {
        var qi = ServiceDesk.showBubble(ctrl,bubble_type || 'qibubble');
        qi.content.removeClass('errormessage');
        qi.content.addClass('loading');
        ServiceDesk.insertView(qi.content,app,view,params,function(){
            qi.content.removeClass('loading');
            if(!!cb)cb(qi.content);
            ServiceDesk.adjustBubble(qi);
        },function(stat,txt) {
            qi.content.removeClass('loading');
            qi.content.addClass('errormessage');
            qi.content.html('Error:' + stat +":" + txt);
            ServiceDesk.adjustBubble(qi);
        });
    },

    /**
    Show a quick info bubble using a specified injection type.
    When showing a qi bubble with an injection type, any registered listeners for that injection type
    will be invoked. See ServiceDesk#registerQIInjection

    @param {jquery} ctrl - The element near which the quick info bubble should be shown
    @param {String} ot - The type of the object being shown in a bubble
    @param {String} ok - the primary key of the object
    @param {String} injection_type - The type of injection to be invoked when the bubble is shown
    @param {Object} injection_data - An extra data to be passed to any listeners that are registered for the given injection_type
    @static
    */
    showQuickInfoWithInjection: function(ctrl,ot,ok,injection_type,injection_data) {
        ServiceDesk.showQuickInfo(ctrl,ot,ok,function(content){
            $(ServiceDesk).trigger(injection_type + '.qi.injection',[content,injection_data]);
        });
    }
    ,showContentInQuickInfo: function(ctrl,content_ctrl) {
        content_ctrl = $(content_ctrl);
        ctrl = $(ctrl);
        var qi = ServiceDesk.showBubble($(ctrl),'listbubble');
        content_ctrl.clone().appendTo(qi.content);
        ServiceDesk.adjustBubble(qi);
    }
    ,reloadImage: function(img) {
        var nsrc = img.src + (img.src.indexOf('?')>0?'&':'?') + 'ticks=' + (new Date().getTime());
        img.src = nsrc;
    },

    /**
    Converts a javascript date object into a string of the form yyyyMMdd
    @param {Date} dt - The date object to be converted
    @returns {String} - the date in yyyyMMdd format
    @static
    */
    dateToString: function(dt) {
        return dt.toString('yyyyMMdd');
    },

    /**
    Converts a javascript date object into a string of the form yyyyMMdd:HHmmss
    @param {Date} dt - The date object to be converted
    @returns {String} - the date in yyyyMMdd:HHmmss format
    @static
    */
    dateTimeToString: function(dt) {
        return dt.toString('yyyyMMdd:HHmmss');
    },

    /**
    Converts a javascript date object into a nicely formatted string.
    The format is decided by the logged-in user's date format.
    @param {Date} dt - the date object to be converted
    @returns {String} - the date in the user's preferred format
    @static
    */
    formatDate : function(dt) {
        return  $.datepicker.formatDate(__date_format__,dt);
    },


    /**
    Converts a javascript date object into a nicely formatted string including the time.
    The format is decided by the logged-in user's date format and time format.
    @param {Date} dt - the date object to be converted
    @returns {String} - the date in the user's preferred format
    @static
    */
    formatDateTime: function(dt) {
        return  $.datepicker.formatDate(__date_format__,dt) + " " + DateTimeField.formatTime(dt);
    },

    /**
    Converts the javascript date object to a nicely formattted time string.
    The date component is ignored.
    @param {Date} dt - the date object to be converted
    @returns {String} - the time in the user's preferred format
    @static
    */
    formatTime: function(dt) {
        return DateTimeField.formatTime(dt);
    },


    createErrorIcon: function() {
        return $('<img />').attr('src',__base_url__+"images/error.gif");
    },


    runPendingHighlights: function() {
        var highlights = $('.tohighlight');
        highlights.removeClass('tohighlight');

        if (ServiceDesk.isMobile()) return;

        highlights.effect('highlight',{},500,function(){});
    },


    runPendingFocus: function() {
        $('.focusme').removeClass('focusme').focus();
    },


    submitForm: function(hr) {
        var form = $(hr).parents('form:first');
        if (!form.exists()) return false;
        if (!form.find('input.__link__action__').exists()) {
            var inp = $('<input />').addClass('__link__action__').attr('type','hidden');
            form.append(inp);
        }
        var inp = form.find('input.__link__action__');

        var name = $(hr).attr('name');
        inp.attr('name',name).val(name);
        form.submit();
    },


    parseJSONObject: function(txt) {
        return $.parseJSON(txt)[0];
    },


    selectItemFromTable: function(hr) {
        var id = $(hr).parents('.sl_modal_container').attr('slid');
        var obj = null;
        obj = ServiceDesk.getElementMetaData(hr);
        $(document).trigger('itemSelectedFromTable',[id,obj,hr]);
    },


    selectObjectFromSearch: function(hr,obj) {
        var id = $(hr).parents('.sl_modal_container').attr('slid');
        $(document).trigger('itemSelectedFromTable',[id,obj,hr]);
    },

    /**
    Retrieves any data associated with a given row in a list of results from a table or celllist.
    Note that you need to set include_metadata=true in the table or celllist for this to work.

    @param {jquery} ctrl - Any element within the row
    @returns {Object} - the data associated with that row
    @static
    */
    getElementMetaData : function(ctrl) {
        var md = $(ctrl).parents('.metadata_container').find('div.sd-table-metadata');
        if (!$(md).exists()) {
            return null;
        }
        //TODO: changed from .html() to .text() Correct?
        var obj = ServiceDesk.parseJSONObject($(md).text());
        return obj;
    },


    loadBrowseViewInPopup: function(hr,bv) {
        var obj = ServiceDesk.getElementMetaData(hr);
        var search_table = $(hr).closest('.searchtable,.celllist').attr('id');
        var st = __Fields__[search_table];
        st.opts.browseview = bv;
        if (!!st) {
            st.startBrowsing(hr,obj.__key__);
            return;
        }
        alert('No search table found:'+search_table);
    },

    _itemSelectionRegister : {},
    itemSelectedFromTable : function(evnt,id,obj,hr) {
        if (!ServiceDesk._itemSelectionRegister[id]) return;
        ServiceDesk._itemSelectionRegister[id](id,obj);
    },

    registerItemSelectionCallback: function(id,cb) {
        ServiceDesk._itemSelectionRegister[id] = cb;
    },


    /**
    Converts the specified datetime object to utc format
    @param {Date} - the datetime object to convert
    @returns {Date} - the date time object in UTC
    */
    convertToUTC: function(now) {
        return new Date(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours(),
            now.getUTCMinutes(),
            now.getUTCSeconds()
            );
    },
    /**
    Parse's a string containing a date or datetime into a javascript date object.
    The string must be in the form yyyymmdd OR yyyymmdd:hhmmss
    In the first case, the time component is set to 12:00 midnight.

    @param {String} s - the string to convert into a date object
    @param {Date} [def=now] - a default date to return if the string conversion failed
    @returns {Date} - a javascript date object
    @static
    */
    parseDateTime: function(s,def) {
        /* yyyymmdd or yyyymmdd:hhmmss */
        if (typeof def=='undefined') def = new Date();
        if (s.length != 8 && s.length != 13 && s.length != 15) return def;
        var year =  xnum(s.substring(0,4));
        var month = xnum(s.substring(4,6));
        var day =   xnum(s.substring(6,8));
        if (s.length == 8)
            return new Date(year,month-1,day);
        var hour = xnum(s.substring(9,11));
        var min = xnum(s.substring(11,13));
        if (s.length == 13)
            return new Date(year,month-1,day,hour,min,0);
        var sec = xnum(s.substring(13,15));
        return new Date(year,month-1,day,hour,min,sec);
    },

    /**
    A synonym for ServiceDesk#parseDateTime
    @static
    */
    parseDate: function(s,def) { return ServiceDesk.parseDateTime(s,def);},

    /**
    @class v3Object
    @property {String} ObjectType - the type of the object (for sub-objects, should be in app.object format)
    @property {String} ObjectID - a textual representation of the object. Usually an ID or Name
    @property {String} ObjectKey - the primary key of the object
    */


    /**
    Get a list of all pinned objects
    @param {String} [ot] - An optional object type to filter by.
    If specified, only objects of this type are returned. This can be a comma separated list to filter
    by multiple object types.
    @returns {v3Object[]} A list of pinned objects
    @static
    */
    getPinnedObjects : function(ot) {
        var otlist = ot.toUpperCase().splitProper(',');

        return _.select(__PinnedObjects__,function(pin){
            if (!ot || ot=='' || ot=='*') return true;
            return _.indexOf(otlist,pin.ObjectType.toUpperCase())>=0;
        });
    },


    /**
    Get the full object mapping of all defined objects
    @param {Function} [callback] - A callback function invoke on execution. The first parameter contains an error
    message (null if no error). The second parameter contains data (null on errors)
    The error object contains a message and object field. The object field represents the request.

    @static
    */
    getObjectMap : function(cb) {
        var url = ServiceDesk.createUrl('BPM/ObjectMap');
        $.ajax({
          type: 'post'
          ,url: url
          ,dataType: 'xml'
          ,success: function(data) {
            cb(null,data);
          }
          ,error: function(request,status,_e) {
            cb({'message':request.responseText,'object':request},null);
          }
        } );
    },

    canShowMDE: function() {
        if ((typeof ServiceDesk.__canShowMDE === 'undefined')
            || (ServiceDesk.__canShowMDE==null) ) {

            /* If the top icon exists and is visible then we are  a go-mission */
            var ke_icon = $('.ke-toolbar-icon');
            if (ke_icon.exists() && !ke_icon.hasClass('invisible')) {
                ServiceDesk.__canShowMDE = true;
            } else {
                ServiceDesk.__canShowMDE = false;
            }
        }
        return ServiceDesk.__canShowMDE;
    }
    ,fillPinBoard: function(hr) {
        var menu = $$('__pinboard__');

        if (!!hr)
            menu.data('origin',hr);

        var c = menu.find('.pinboard.sidebar_content');
        c.empty();
        if (__PinnedObjects__.length>0) {

            var clear_all = $('<div />').addClass('clearall').text($L('sys.pinboard-clear-all'));
            clear_all.touchClick(function(e){
                e.preventDefault();
                ServiceDesk.clearPinnedObjects();
                menu.removeClass('editmode');
                ServiceDesk.showPinBoard(menu.data('origin'));
                i_a.track('Clear Pinboard');
            });
            c.append(clear_all);
        }

        for(var i=0;i<__PinnedObjects__.length;i++) (function(){
            var pin = __PinnedObjects__[i];
            var a = ServiceDesk.createObjectLink(pin,{include_image:true,qi:true});
            a.addClass('sidebar_link_switch');
            var d = $('<div class="clearfix" />');
            d.append(a);
            c.append(d);
            if (ServiceDesk.canShowMDE()) {
                var ke = $('<span class="ke v3icon-ke" />');
                ke.touchClick(function(evnt){
                    evnt.preventDefault();
                    ServiceDesk.showKE(ke,{object:pin});
                });
                d.append(ke);
            }
            var clearer = $('<div class="remover v3icon-close" />');
            d.append(clearer);
            clearer.touchClick(function(evnt){
                evnt.preventDefault();
                ServiceDesk.clearPinnedObject(pin);
                i_a.track('Delete Pinboard Item');
                ServiceDesk.showPinBoard(menu.data('origin'));
            });

        })();
        if (__PinnedObjects__.length==0) {
            var d = $('<div />').addClass('nodata').text($L('sys.pinboard-nodata'));
            c.append(d);
            menu.find('.subtitle.clearer').makeInvisible();
        } else {
            menu.find('.subtitle.clearer').makeVisible();
        }
    }
    ,clearPinnedObject: function(obj) {
        var pbheader = $('.pbheader');
        var url = ServiceDesk.createUrl('Session/clearpin');
        var params = obj;
        $.ajax({
            type: 'post'
            ,url: url
            ,data: params
            ,dataType: 'json'
            ,success: function(data) {
                $('.pbloader').removeClass('loading_medium');
                pbheader.effect('highlight',{},500,function(){ });
                ServiceDesk.fillPinBoard();
            }
            ,error: function(request,status,_e) {
                if (!!err) err(request.responseText);
                console.log('Error clearing pins',request.responseText);
                $('.pbloader').removeClass('loading_medium');
            }
        });
        __PinnedObjects__ = _.reject(__PinnedObjects__,function(o){
            return String.matches(o.ObjectType,obj.ObjectType) && String.matches(o.ObjectKey,obj.ObjectKey);
        });
    }
    ,clearPinnedObjects: function() {
        var pbheader = $('.pbheader');
        var url = ServiceDesk.createUrl('Session/clearpins');
        var params = {};
        $.ajax({
            type: 'post'
            ,url: url
            ,data: params
            ,dataType: 'json'
            ,success: function(data) {
                $('.pbloader').removeClass('loading_medium');
                pbheader.effect('highlight',{},500,function(){ });
                ServiceDesk.fillPinBoard();
            }
            ,error: function(request,status,_e) {
                if (!!err) err(request.responseText);
                console.log('Error clearing pins',request.responseText);
                $('.pbloader').removeClass('loading_medium');
            }
        });
        __PinnedObjects__ = [];

    },

    /**
    Returns true if the user is running iViva in call center operator mode
    */
    isCallCenterMode: function() {
        return (!!top && !!top.frames && !!top.frames['opconsole']);
    },

    /**
    Causes a phone number to be selected into the operator console
    This only has affect when running in call center operator mode
    @param {String} sp - the phone number to select
    @static
    */
    phoneSelected: function(sp) {
        var phone = $(sp).text();
        if (!phone) return;
        var f = window.setNumber;
        if (!f) {
            if (ServiceDesk.isCallCenterMode())
                f = top.frames['opconsole'].setNumber;
        }
        if (typeof f == 'function') {
            f(phone);
        }
    }
    ,updateCCConsole: function() {
        if (!ServiceDesk.isCallCenterMode()) return;
        var r = top.frames['opconsole'].updateCurrentCall;
        if (typeof r != 'function') {
            console.log('ERROR: updateCurrentCall is not a function');
            return;
        }
        r();
    }
    ,getCurrentCCCallKey : function() {
        if (!ServiceDesk.isCallCenterMode()) return null;
        var cfk = top.frames['opconsole'].getCurrentCallKey;
        if (typeof cfk != 'function') {
            console.log('ERROR: cfk is not a function');
            return null;
        }
        return xint(cfk());
    },
    /**
    @static
    */
    reloadPinnedObjects:function(){
        var url = ServiceDesk.createUrl('Session/pinnedobjects');
        $.ajax({
            type: 'post'
            , url: url
            , data: {}
            , dataType: 'json'
            , success: function (data) {
                __PinnedObjects__ = data;
            }
            , error: function (request, status, _e) {
                if (!!err) err(request.responseText);
                console.log('Error pinning', obj, request.responseText);
                $('.pbloader').removeClass('loading_medium');
            }
        });   
    },
    /**
    Add an object to the pinboard.
    @param {v3Object} obj - the object to be added
    @static
    */
    addPinnedObject : function(obj) {
        var pbheader = $('.pbheader');
        var found= null;
        var found_index = -1;
        for(var i=0;i<__PinnedObjects__.length;i++) {
            var pin = __PinnedObjects__[i];
            if ( (pin.ObjectType == obj.ObjectType) &&
            (pin.ObjectKey == obj.ObjectKey)) {
                found_index = i;
                found= pin;
                break;
            }
        }
        if (!!found) {
            Array.remove(__PinnedObjects__,found_index);
        }
        __PinnedObjects__.push(obj);
        ServiceDesk.fillPinBoard();
        i_a.track('Add to Pinboard',{ot:obj.ObjectType});
        Guides.showHint('pinned',{
            element:$('.pinboard-btn')
            ,content:$L('sys.pinboard-item-added')
            ,duration:1000
            ,position:'bottom'
        });
        var url = ServiceDesk.createUrl('Session/pinobject');
        var params = obj;

        if (false) { //mark as true to auto-pin objects
            if (!!top && !!top.frames && !!top.frames['opconsole']) {
                var cfk = top.frames['opconsole'].getCurrentCallKey;
                if (typeof(cfk) == 'function') {

                    var cfk_key = cfk();
                    if (!!cfk_key) params.__CurrentCallKey__ = cfk_key;
                }
            }
        }
        $('.pbloader').addClass('loading_medium');
        $.ajax({
            type: 'post'
            ,url: url
            ,data: params
            ,dataType: 'json'
            ,success: function(data) {
                $('.pbloader').removeClass('loading_medium');
                pbheader.effect('highlight',{},500,function(){ });
            }
            ,error: function(request,status,_e) {
                if (!!err) err(request.responseText);
                console.log('Error pinning',obj,request.responseText);
                $('.pbloader').removeClass('loading_medium');
            }
                });
        return obj;
    }
    ,loadPinnedObjects : function(obj_list) {
        if (!!obj_list && obj_list.length>0)
            __PinnedObjects__ = obj_list;
    }
    ,loadHistoryObjects : function(obj_list) {
        if (!!obj_list && obj_list.length>0)
            __HistoryObjects__ = obj_list;
    }
    ,registerMenuCloser : function(id,closer) {
        if (!__Menus__[id])
            __Menus__[id] = {};
        __Menus__[id].close = closer;
    }
    ,closeMenus: function() {
        _.each(__Menus__,function(v,k) {
            v.close();
        });
    }
    ,closeOtherMenus: function(exceptme) {
        _.each(__Menus__,function(v,k) {
            if (k==exceptme) return;
            v.close();
        });
    },

    /**
    Briefly flash a notification message on screen
    @param {String} msg - The message to be shown
    @param {Boolean} [is_html=false] - Set to true to cause the message to be interpreted as raw html
    @param {Function} [callback] - An optional callback to be executed once the notification is displayed
    @static
    */
    flashNotification: function(msg,is_html,callback) {
        if (ServiceDesk.isMobile()) return;
        var elm = $('.alert_message');
        if (!elm.exists()) {
            elm = $('<div />').addClass('alert_message');
            $('body').append(elm);
            elm.hide();
        }
        if (arguments.length==2) {
            if (typeof is_html == 'function') {
                callback = arguments[1];
                is_html = false;
            }
        }
        if (!!is_html)
            elm.html(msg)
        else
            elm.text(msg);
        var x = elm.offsetParent().width()/2 - elm.width()/2;
        elm.css('left',x+'px');
        elm.fadeIn(500,function(){
            if (!!callback && (typeof callback == 'function') )
                callback();
        }).delay(700).fadeOut(700);

    },
    /**
    Register a callback when a quick info bubble is created with the specified injection name.
    See ServiceDesk#showQuickInfoWithInjection for how to invoke a quick info bubble with an injection name.
    @param {String} injection_type - the type of injection to look for. When a bubble is created with the specified injection_type, the callback function is called
    @param {Function} cb - The callback function to execute when a bubble with the specified injection type is shown.
    The callback takes 2 parameters: control - the qi content element, and data - the data associated with the injection_type
    @static
    */
    registerQIInjection: function(injection_type,cb) {
        $(ServiceDesk).bind(injection_type+'.qi.injection',function(evnt,control,data){
            cb(control,data);
        });
    },

    /**
    Given an id which was generated from an xid, extract out the base portion of it
    @static
    */
    extractScopeBase: function(id) {
        var matches = id.match(/x-scope-([0-9]+)-.*/)
        if (!matches) return '';
        if (matches.length>=2)
            return matches[1];

    },
    /**
    Update a set of fields by re-rendering them from the server.
    Only fields which have a getFieldContainer() function can be updated.

    @param {String[]} fields - an array of field ids to be updated
    @param {String} app - the name of the application which contains the view that these fields originated from
    @param {String} view - The name of the view that the fields originated from
    @param {Object} params - Any query string parameters to pass - these should usually match the same parameters passed when the view was
    first created. Usually you would just pass {@link QS}() here
    @param {Function} [err] - A function to execute if the update failed. The function will be passed an error message as the first parameter
    @param {Function} [opts.nohighlight] - If set to true, then don't flash the update fields to indicate they have been updated. Default is false (which means it will flash)
    @param {Function} [opts.done] - A function to call when the update is done. The first argument will contain the error (if any) and null otherwise
    @static
    */
    updateFieldsInView: function(fields,app,view,params,err,opts) {
        params = params || {};
        opts = opts || {};
        params['__ajax__'] = '1';
        params['__failonerror__'] = '1';
        params['__mode__'] = 'fieldreload';
        var xbase = '';
        for(var i=0;i<fields.length;i++) {
            var xb = ServiceDesk.extractScopeBase(fields[i]);
            if (!!xb) {
                xbase = xb;
                break;
            }
        }


        var url = ServiceDesk.appUrl() + app + '/' + view;
        url += '!@' + fields.join(',');

        if (!!xbase) {
            url = ServiceDesk.addQueryString(url,{'__xbase__':xbase});
        }

        $.ajax({
            type: 'post'
            ,url: url
            ,data: params
            ,dataType: 'xml'
            ,success: function(data) {
                $(data).find('Field').each(function(){
                    var id = $(this).attr('id');
                    var content = $(this).text();
                    var field = ServiceDesk.getField(id);
                    if (!field) return;
                    if (!field.getFieldContainer) return;
                    var container = field.getFieldContainer();
                    container.replaceWith(content);
                    if (!!ServiceDesk.getField(id) && !!ServiceDesk.getField(id).fieldUpdated)
                        ServiceDesk.getField(id).fieldUpdated(opts);
                });
                ServiceDesk.fieldsUpdated();

                if (!!opts.done)
                    opts.done(null);

            }
            ,error: function(request,status,_e) {
                if (!!err) err(request.responseText);

                if (!!opts.done)
                    opts.done(request.responseText);
            }
                });
    },

    /**
    Generate a random id suitable to be assigned to an element
    @param {String} [prefix] - An optional prefix to use for the id
    @returns {String}  - a random id
    */
    generateID: function(prefix) {
        return '__dyn__' + (prefix||"fld") + (__idseed__++);
    },

    /**
    Returns the timezone that is assigned to the page.
    This is usually set on the page using the <ObjectTimeZone> tag on views
    @returns {String} - the timezone
    @static
    */
    objectTimeZone: function() {
        if (typeof __object_timezone__ == 'undefined') return '';
        return __object_timezone__;
    },


    /**
    Returns the timezone that is assigned to the logged-in user
    @returns {String} - the timezone
    @static
    */
    userTimeZone: function() {
        if (typeof __user_timezone__ == 'undefined') return '';
        return __user_timezone__;
    }
    ,requestData: function(type,finished) {
        $(document).trigger('request.channel.' + type,[function(data) {
            finished(data);
        }]);
    }
    ,provideData: function(type,data) {
        $(document).bind('request.channel.' + type,function(e,func){
            func(data);
        });
    }
    ,loadWeblets: function() {
        $('.weblet_cell').each(function(){
            var weblet = $(this);
            var view = weblet.attr('view');
            var app = weblet.attr('app');
            var content = weblet.find('.content');
            content.addClass('loading');
            ServiceDesk.insertView(content,app,view,{},function(){
                content.removeClass('loading');
            },function(status,txt) {
                content.removeClass('loading');
                content.empty();
                $('<div />').addClass('nodata').html('Error: ' + txt).appendTo(content);
            });
        });
    }
    ,beginPolling: function(timer) {
        if (!timer) {
            if (!!ServiceDesk.pollingSignal)
                clearTimeout(ServiceDesk.pollingSignal);
                return;
        }

        if (!!ServiceDesk.pollingSignal) {
            clearTimeout(ServiceDesk.pollingSignal);
        }

        ServiceDesk.pollingTimer = timer;

        ServiceDesk.pollingSignal = setTimeout(function(){
            ServiceDesk.pingServer(function(){
                ServiceDesk.beginPolling(ServiceDesk.pollingTimer);
            });
        },ServiceDesk.pollingTimer);
    },
    /**
    A simple heartbeat sent to the server to keep the session alive.
    You do not need to call this explicitly. It is called on page loads automatically.
    @param {Function} [cb] - a callback function to execute after the pin completes. Is called on both success and failure.
    @static
    */
    pingServer: function(cb) {
        var url = ServiceDesk.accountUrl('notificationping');
        $.ajax({
            type: 'post'
            ,url: url
            ,data: {__sc__:__token__||''}
            ,success: function(data) {
                ServiceDesk.pendingNotificationCount = xint(data);
                ServiceDesk.updateNotificationStatus();
                if (!!cb) cb();
            }
            ,error: function(request,status,_e) {
                console.log('Error pinging server',request.responseText);
                if (!!cb) cb();
            }
        });
    }
    ,formatNotificationMessage: function(msg,cb) {
        var url = ServiceDesk.accountUrl('formatmessage');
        $.ajax({
            type: 'post'
            ,url: url
            ,data: {'Message':msg}
            ,success: function(data) {
                if (!!cb) cb(data);
            }
            ,error: function(request,status,_e) {
                console.log('Error getting notification message',request.responseText);
                if (!!cb) cb(null);
            }
        });
    }
    ,formatNotificationMessages: function(msg,smsg,subj,cb) {
        var url = ServiceDesk.accountUrl('formatmessages');
        $.ajax({
            type: 'post'
            ,url: url
            ,data: {'Message':msg,'ShortMessage':smsg,'Subject':subj}
            ,success: function(data) {
                if (!!cb) cb(data);
            }
            ,error: function(request,status,_e) {
                console.log('Error getting notification message',request.responseText);
                if (!!cb) cb(null);
            }
        });
    }
    ,updateNotificationStatus: function() {
        if (ServiceDesk.pendingNotificationCount>0)
            $('.inbox-btn').addClass('pending');
        else
            $('.inbox-btn').removeClass('pending');
    }
    ,isMobile: function() {
        return !!($.mobile);
    }
    ,unhideObject: function(hr,model,key) {
        $(hr).executeModelAction(model,'Unhide',{'key':key},function(){
            location.reload();
        });
    },
    confirmationMap : {},

    /**
    Ask the user to confirm an action. Ensure that it is called only once per page load.
    @param {String} key - a unique key identifying this confirmation request
    @param {String} message - The confirmation message to ask from the user
    @returns {Boolean} - true if the user confirmed, else false
    @static
    */
    confirmOnce: function(key,message) {
        if (!!ServiceDesk.confirmationMap[key]) return false;
        ServiceDesk.confirmationMap[key] = '1';
        return confirm(message);
    },

    /**
    Register a function to be called after the page loads.
    @param {Function} func - the function to be called
    @static
    */
    onLoad : function(func) {
        if (ServiceDesk.isMobile()) {
            $(document).bind('pageinit',func);
        } else {
            $(func);
        }
    }
    ,renderFieldList: function(fields) {
        var t = $('<table />').addClass('field_table');
        for(var k=0;k<fields.length;k++) {
            var title = fields[k].title;
            var element = fields[k].content;
            var tr =  $('<tr />').addClass('field_row');
            var td1 = $('<td />').addClass('field_name').append(title);
            var td2 = $('<td />').addClass('field_content').append(element);
            tr.append(td1,td2);
            t.append(tr);
        }
        return t;
    }
    ,renderFieldListVertical: function(fields) {
        var t= $('<div />');
        for(var k=0;k<fields.length;k++) {
            var title = fields[k].title;
            var element = fields[k].content;
            var cr = $('<div />').addClass('fieldlist-vertical');
            var td1 = $('<div />').addClass('fieldlist-vertical-title').append(title);
            var td2 = $('<div />').addClass('fieldlist-vertical-content').append(element);
            cr.append(td1,td2);
            t.append(cr);
        }
        return t;
    }
    ,hideInFieldList: function(ctrl) {
        if (!!ctrl.getFieldContainer)
            ctrl = ctrl.getFieldContainer();
        $(ctrl).closest('tr').makeInvisible();
    }
    ,showInFieldList: function(ctrl) {
        if (!!ctrl.getFieldContainer)
            ctrl = ctrl.getFieldContainer();
        $(ctrl).closest('tr').makeVisible();
    },

    /**
    Update the geo location for the given user based on the browser's geolocation api
    Requires that the browser supports geo locations
    @param {String} uk - the key of the user to be updated
    @static
    */
    updateUserPosition: function(uk) {
        uk = xint(uk);
        if (uk==0) return;
        if (!navigator || !navigator.geolocation) return;
        var success = function(position) {
            var lat = position.coords.latitude;
            var lng = position.coords.longitude;
            ServiceDesk.executeService('User','UserGeoLocation:UpdateGeoLocation',{'X':lng,'Y':lat,'UserKey':uk})
        };
        var error = function(msg) {
            console.log('Unable to retrieve current location:' , msg);
        };
        navigator.geolocation.getCurrentPosition(success,error);
    },
    openPrintView: function(hr) {
        var url = $(hr).attr('href');
        if (url=='#') {
            url = ServiceDesk.appUrl(__app__ + '/' + __view__ + '.print');
            url = ServiceDesk.addQueryString(url,QS());
        }
        var w = window.open(url,'popUpWindow','height=700,width=800,left=10,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes');
    },

    /**
    Open a url in a popup window
    @param {String} url - the url to be opened
    @param {Object} [opts]
    @param {Object} [opts.width=800] - The width of the window to be opened
    @param {Object} [opts.width=700] - The height of the window to be opened
    @static
    */
    openNewWindow:function(url,opts) {
        opts = opts || {};
        w = opts.width || '800';
        h = opts.height || '700';
        return window.open(url,'popUpWindow','height='+h+',width='+w+',left=10,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes');
    },

    /**
    Open a url in a popup window with post parameters
    @param {String} url - the url to be opened
    @param {Object} [post] - data to be posted
    @param {Object} [opts]
    @param {Object} [opts.width=800] - The width of the window to be opened
    @param {Object} [opts.width=700] - The height of the window to be opened
    @static
    */
    postToNewWindow:function(url,params,opts) {
        opts = opts || {};
        w = opts.width || '800';
        h = opts.height || '700';
        var form = $('<form />');
        var id = '__sd_window_o__';
        form.attr({
            'method':'post'
            ,'action':url
            ,'target':'popUpWindow'
            ,'id':id
        });
        _.each(params,function(v,k){
            var h = $('<input />').attr('type','hidden')
            .attr('id',k)
            .attr('name',k)
            .val(v);
            form.append(h);
        });

        $$(id).remove()
        $('body').append(form);
        window.open(url,'popUpWindow','height='+h+',width='+w+',left=10,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes');
        form.submit();
    },

    showPopupMenu: function(hr,mnu,opts) {
        if (!!hr.x && !!hr.y) {
            var o = hr;
            hr = {
                offset: function() {
                    return {left:o.x,top:o.y};
                }
                ,width: function() {return 10;}
                ,height: function() {return 10;}
                ,outerHeight: function() {return 10;}
            }
        } else {
            hr = $(hr);
        }
        opts = opts || {};
        _.defer(function(){
            var menu = $$(mnu);
            if (!menu.find('.pointer').exists()) {
                var pointer = $('<div />').addClass('pointer pointer_t');

                if (opts.pointer == 'right') {
                    pointer.addClass('right');
                    menu.addClass('right');
                }

                menu.append(pointer);
            }
            var offset = hr.offset();
            var factor = 0.5;
            if (opts.pointer == 'right') {
                factor = 1.0;
            }

            offset.left -= menu.width()*factor;
            if (opts.pointer == 'right') {
                offset.left += hr.width()*0.5;
            }

            menu.find('.pointer').css('marginLeft','');

            if (offset.left < 0) {
                menu.find('.pointer').css({
                    marginLeft:hr.offset().left
                });
                offset.left = 0;
            } else {
                var op = $(menu).offsetParent();
                var w = $(document).width();
                var w = op.width() ;//+ op.css('marginRight') + op.css('marginLeft');
                if (offset.left + menu.width() > w) {
                    offset.left = w - menu.width();
                    menu.find('.pointer').css({
                        marginLeft:hr.offset().left - offset.left
                    });
                }
            }
            offset.top += hr.outerHeight()+10;


            menu.offset(offset);
            menu.css('display','none');
            menu.css('visibility','visible');
            menu.fadeIn(100);

        });
        if (mnu == '_userprofilemenu_') {
            i_a.track('Show Profile');
        }
    },

    /**
    @class MenuGroup
    @property {String} name - The name of the menu group.
    @property {Array<MenuItem>} items - A list of menu items within this group
    */

    /**
    @class MenuItem
    @property {String} href - A url to be called when the item is clicked
    @property {Function} click - A function to be called when the item is clicked. If this is set, href is ignored
    @property {String} app - The name of the application containing the view to go to when this item is clicked. Ignored if href or click are set.
    @property {String} view - The name of the view to go to when this item is clicked. Ignored if href or click are set.
    @property {String} text - The title of the menu item
    @property {String} css - Any extra css classes to be added to the menu item
    @property {String} styles - Any extra css style rules to be applied to the menu item
    */


    /**
    Render a popup menu near a given element.
    @param {jquery} hr - the element near which the popup should be rendered
    @param {String} name - A unique name to identify this menu by
    @param {Array.<MenuGroup>} menus - A list of menu groups to be shown
    @param {Object} [opts]
    @param {Boolean} opts.horizontal - Set to true if you want the menu groups to be rendered horizontally in the menu.
    Note that this is deprecated. Only vertical menus are officially supported.
    @static
    */
    renderMenu: function(hr,name,obj,opts) {
        opts = opts || {};
        var id = '__menu__' + name;
        var sheet = ServiceDesk.getBubbleBackground();
        if (!$$(id).exists()) {
            var dv = $('<div />').addClass('bubble popupmenu darkbackground');
            dv.attr('id',id);
            // $('body').append(dv);
            sheet.append(dv);
        }
        var menu = $$(id);
        menu.empty();
        for(var i=0;i<obj.length;i++) {
            var group = obj[i];
            var title = group.name;
            var dvg = $('<div />');
            dvg.addClass('sidebar_group');
            if (!!opts.horizontal)
                dvg.addClass('horizontal');
            var header = $('<div />').addClass('sidebar_header').text(title);
            dvg.append(header);
            var sc = $('<div />').addClass('sidebar_content');
            dvg.append(sc);
            for(var j=0;j<group.items.length;j++) (function(){
                var item = group.items[j];
                var url = item.href;
                if (!!item.click) {
                    url = '#';
                }
                var icon = '';
                if (!url && (!!item.app && !!item.view)) {
                    url = ServiceDesk.appUrl(item.app + '/' + item.view);
                    icon = 'v3-app-icon v3-app-icon-' + item.app.toLowerCase();

                    /* Special case when going to the home page */
                    if (String.matches(item.app,'User') && String.matches(item.view,'home')) {
                        icon = 'v3icon-home-2';
                    }
                }
                var a = $('<a />').attr('href',url);
                if (!!item.click) {
                    a.touchClick(function(e){
                        e.preventDefault();
                        item.click();
                    });
                }
                a.addClass('sidebar_link_container clearfix sidebar_link_switch');
                if (!!item.css) {
                    a.addClass(item.css);
                }
                if (!!item.styles) {
                    a.attr('style',item.styles)
                }
                if (!!icon) {
                    $('<span />').addClass(icon + ' menuicon ').appendTo(a);
                }

                var sp = $('<span />').addClass('sidebar_link_text').text(item.text);
                a.append(sp);

                var sp2 = $('<span />').addClass('v3icon-arrow-right subtxt arrow sidebar_link_arrow');
                a.append(sp2);
                var wrapper = $('<div />');
                wrapper.append(a);
                sc.append(wrapper);
            })();
            menu.append(dvg);
        }

        sheet.makeVisible();
        ServiceDesk.showPopupMenu(hr,id);
    },

    /**
    Show the metadata explorer
    @static
    @param {Object} [opts]
    @param {Boolean} opts.fillFromPinboard - fill all pinboard objects into the KE when opening it
    @param {Object} opts.object  - An object to add to KE when opening it
    */
    showKE: function(hr,opts) {
        /*
        opts = opts || {};
        var ke = ServiceDesk.__ke__;
        if (!ke) {
            ke = ServiceDesk.__ke__ = new KE();
            // ke.open();
        }

        ke.open();
        if (!!opts.fillFromPinboard) {
            _.each(__PinnedObjects__,function(obj){
                ke.addObject(obj);
            });
        }
        if (!!opts.object) {
            node = ke.addObject(opts.object);
            ke.focusObject(opts.object);
        }
        ke.refresh();
        $(ServiceDesk).trigger('ke.open',[opts])
        */
        MDE.Explorer.show(opts.object.ObjectType,opts.object.ObjectKey, opts.object.ObjectID);
    },

	/**
    Shows the global search dialog
    @static
    */
    elasticSearch: function(hr) {
		ServiceDesk.loadRemoteFormInLayer('System','elasticsearch.partial',null,null,{css:'max-width:600px;'});
    },

    renderUserMenu: function(hr) {
        if (typeof __usermenu__ == 'undefined') return;
        if (!__usermenu__) return;
        try {
            var obj = JSON.parse(__usermenu__);
        } catch (e) {
            console.log('Error parsing user menu:',e);
        }
        ServiceDesk.renderMenu(hr,'__usermenu__',obj,{'horizontal':false});
    },

    /**
    Show the user's inbox in a popup
    @static
    */
    showInbox: function(hr) {
        ServiceDesk.loadViewInPopup(hr,'System','inbox.popup',{},null,null,{stretch:true});
    },

    /**
     * Invoke the contact-support dialog
     * @param {string} subject 
     * @param {string} category 
     * @param {string} hideContainedField
     */
    contactSupport:function(subject,category,hint) {
        var sd = {};
        if (typeof __supportdetails__ != 'undefined') sd = __supportdetails__;
        ServiceDesk.loadRemoteFormInLayer('System','contactsupport.partial',{'la':sd.lucyAction,'subject':subject||'','supporttype':category||'',hint:hint||''});
    },




    /**
    Show the iviva help menu
    @static
    */
    showHelpMenu: function(hr) {
        var sheet = ServiceDesk.getBubbleBackground();
        var a = $(hr);
        _.defer(function(){Guides.showAllElementHints();});
        var menu = $$('__helpmenu__');
        var hi = [];
        if (typeof __helpindex__ != 'undefined') hi = __helpindex__;

        var sd = {};
        if (typeof __supportdetails__ != 'undefined') sd = __supportdetails__;

        if (!menu.exists()) {
            menu = $('<div />').attr('id','__helpmenu__').addClass('popupmenu darkbackground bubble ').css('visibility','hidden');
            var sg = $('<div />').addClass('sidebar_group');
            menu.append(sg);
            for(var i=0;i<hi.length;i++) (function(){
                var app = hi[i].app;
               var view = hi[i].view;
               var si =  $('<div />').addClass('helpmenu sidebar_content');
               var a = $('<a />');
               a.addClass('sidebar_link_switch');
               a.text(hi[i].title);
               var url = ServiceDesk.getDocUrl(app,view);
               a.attr('href',url);
               
               a.click(function(e){
                e.preventDefault();
                ServiceDesk.loadDocumentation(app,view);
               });
               si.append(a);
               sg.append(si);
            })();

            var msg = $L('sys.help-getting-started');
            var xr = '<div class="helpmenu sidebar_content">'
            +'<a class="sidebar_link_switch" onclick="ServiceDesk.loadHelp();return false;" href="#">'
            +msg
            +'</a>'
            +'</div>';
            var group = $(xr)
            // group.find('.sidebar_header').text($L('sys.pinboard-title'));
            sg.append(group);

            if (!!sd.lucyAction || !!sd.emailAddress) {
                var si =  $('<div />').addClass('helpmenu sidebar_content');
                var a = $('<a />');
                a.addClass('sidebar_link_switch');
                a.text($L('sys.help-contact-support'));
                a.attr('href','#');
                a.click(function(e){
                    e.preventDefault();
                    ServiceDesk.loadRemoteFormInLayer('System','contactsupport.partial',{'la':sd.lucyAction});
                });
                si.append(a);
                sg.append(si);
            }
            sheet.append(menu);
        }
        _.defer(function(){
            sheet.makeVisible();
            ServiceDesk.showPopupMenu(hr,'__helpmenu__');
            i_a.track('Open Help');
        });
    },

    /**
    Show the pinboard menu
    @static
    */
    showPinBoard: function(hr) {
        var menu = $$('__pinboard__');
        var sheet = ServiceDesk.getBubbleBackground();
        if (!menu.exists()) {
            menu = $('<div />').attr('id','__pinboard__').addClass('popupmenu darkbackground bubble ').css('visibility','hidden');
            var xr = '<div class="sidebar_group"><div class="sidebar_header clearfix"></div><div class="pinboard sidebar_content"></div></div>';
            var group = $(xr)

            var header_title = $('<div />').addClass('title').text($L('sys.pinboard-title'));
            // var header_subtitle = $('<div />').addClass('subtitle subtxt clearer ').text('Clear');
            var header_subtitle = $('<div />');

            var editor = $('<div />').addClass('subtitle subtxt edit v3icon-edit ').text('');
            var done = $('<div />').addClass('subtitle subtxt done  ').text($L('sys.pinboard-done'));
            header_subtitle.append(editor).append(done);
            done.touchClick(function(e) {
                e.preventDefault();
                menu.removeClass('editmode');
            });
            editor.touchClick(function(e) {
                e.preventDefault();
                menu.addClass('editmode');
                i_a.track('Edit Pin Board');
            });


            group.find('.sidebar_header').append(header_title);
            group.find('.sidebar_header').append(header_subtitle);
            menu.append(group);
            // $('body').append(menu);
            sheet.append(menu);
        }
        ServiceDesk.fillPinBoard(hr);

        _.defer(function(){
            sheet.makeVisible();
            ServiceDesk.showPopupMenu(hr,'__pinboard__',{pointer:'right'});
            i_a.track('Show Pin Board');
        });
    },

    /**
    Returns true if the page is currently in edit mode.
    @static
    */
    isPageEditMode: function(hr) {
        return $('body').hasClass('page-edit-mode');
    }
    ,showExtendedAppList: function(hr) {
        var drawer = $('.applist.drawer');
        var more_link = $('.applist.main .more');
        var left = more_link.offset().left;
        var top = more_link.offset().top;
        var parent = drawer.parent();

        /* Change the drawer from invisible to hidden in order to calculate the width of it */
        drawer.addClass('hidden');
        drawer.removeClass('invisible');

        if (!parent.hasClass('appdrawer')) {
            var appdrawer = $('<div />').addClass('appdrawer invisible');
            appdrawer.width(drawer.width());
            appdrawer.height(drawer.height());
            appdrawer.append(drawer);
            $('body').append(appdrawer);
            parent = appdrawer;
        }


        more_link.addClass('expanded');
        more_link.find('.v3-app-icon')
            .removeClass('v3icon-arrow-right')
            .addClass('v3icon-arrow-left')
            ;
        more_link.find('.v3-app-icon-title').text($L('Less'));

        drawer.css({marginRight:drawer.width()});
        drawer.removeClass('hidden');
        parent.makeVisible();

        parent.width(drawer.width());
        parent.height(drawer.height());

        parent.css({
            left:left + more_link.width()
            ,top:top + more_link.height()  - parent.height()
        });
        drawer.animate({marginRight:0},400,'easeOutQuint',function(){});
    }

    ,hideExtendedAppList: function() {
        var drawer = $('.applist.drawer');
        drawer.animate({marginRight:drawer.parent().width()},400,'easeOutQuint',function(){
            $('.appdrawer').makeInvisible();
            var more_link = $('.applist.main .more');
            more_link.removeClass('expanded');
            more_link.find('.v3-app-icon')
                .removeClass('v3icon-arrow-left')
                .addClass('v3icon-arrow-right')
                ;
            more_link.find('.v3-app-icon-title').text($L('More'));
        });
    },

    hideAppListReset: function() {
        var applist = $('.applist-reset');
        applist.makeInvisible();
    },

    showAppListReset: function() {
        var applist = $('.applist.main');
        if (!applist.exists()) return;

        var reset = $('.applist-reset');
        if (!reset.exists()) {
            reset = $('<div />').addClass('applist-reset');
            var sp = $('<span />').addClass('v3icon-Undo');
            reset.append(sp);

            var sptxt = $('<span />').addClass('lbl').text($L('sys.appmenu-reset'));
            // reset.append(sptxt);

            applist.parent().append(reset);
            reset.touchClick(function(evnt){
                evnt.preventDefault();
                var msg = $L('sys.confirm-reset-applist');
                if (!confirm(msg)) return;
                ServiceDesk.resetAppList();
            });
        }
        reset.makeVisible();
        var pos = applist.position();
        console.log(pos);
    },
    /**
    Switch the page's edit mode
    @static
    */
    togglePageEditMode: function(hr) {
        if (!$('body').hasClass('page-edit-mode')) {
            $('body').addClass('page-edit-mode');
            $(ServiceDesk).trigger('page.openedit');
            $(hr).addClass('icon-tb-edit-toggled');
            $('.applist').sortable('enable');
            ServiceDesk.showExtendedAppList();
            ServiceDesk.showAppListReset();
            Guides.showHint('edit-guide',{
                element:$('.page-editor')
                ,content: $L('sys.edit-done')
                ,persist: true
                ,position:'bottom'
            });
            Guides.showHint('appmenu-guide',{
                element: $('.applist')
                ,content:$L('sys.header-app-menu-instructions')
                ,persist: true
                ,position:'right'
                ,positionOffset:72*1.3
                ,size:'small'
                ,dismissable: true
            });
            var v = '';
            if (typeof __view__ != 'undefined') v = __view__;
            i_a.track('Page Edit Mode',{view:v});
        } else {
            $('body').removeClass('page-edit-mode');
            $('.applist').sortable('disable');
            ServiceDesk.hideExtendedAppList();
            ServiceDesk.hideAppListReset();
            UserPrefs.saveColorSchemes();
            $(ServiceDesk).trigger('page.closeedit');
            $(hr).removeClass('icon-tb-edit-toggled');
            Guides.hideHint('edit-guide')
            Guides.hideHint('appmenu-guide')
        }
    }
    ,isEditMode: function() {
        return $('body').hasClass('page-edit-mode');
    },

    /**
    Gets a list of all color scheme names that are supported
    @returns {String[]} colorschemes
    @static
    */
    getAllColorSchemes: function() {
        return [
        'colorscheme1'
        ,'colorscheme2'
        ,'colorscheme3'
        ,'colorscheme4'
        ,'colorscheme5'
        ,'colorscheme6'
        ,'colorscheme7'
        ,'colorscheme8'
        ,'colorscheme9'
        ,'colorscheme10'
        ,'colorscheme11'
        ,'colorscheme12'
        ];
    },

    /**
    Gets the color scheme applied to a given element.
    Returns null if none was applied.
    @param {jquery} elm - the element to get the colorscheme for
    @static
    */
    getColorScheme: function(elm) {
        var schemes = ServiceDesk.getAllColorSchemes();
        for(var i=0;i<schemes.length;i++) {
            if ($(elm).hasClass(schemes[i]))
                return schemes[i];
        }
        return null;
    },


    /**
    Set the colorscheme for the given element
    @param {jquery} elm - the element to which the colorscheme must be applied
    @param {String} colorscheme - the color scheme to apply
    @static
    */
    setColorScheme: function(elm,cs) {
        var e = ServiceDesk.getColorScheme(elm)
        if (!!e) $(elm).removeClass(e);
        $(elm).addClass(cs);
    },

    /**
    Serialize all color schemes on the page into a json object
    @static
    */
    serializeColorSchemes: function() {
        var out = {}
        $('.color-scheme-editable').each(function(){
            var eid = $(this).attr('schemeid');
            var cs = ServiceDesk.getColorScheme($(this));
            if (!!cs) {
                out[eid] = cs;
            }
        });
        return out
        // return JSON.stringify(out);
    }
    ,loadColorSchemes: function(j) {
        _.each(j,function(v,k) {
            var elm = $('[schemeid='+k+']');
            elm.each(function(){
                if ($(this).hasClass('color-scheme-editable')) {
                    $(this).addClass(v);
                }
            });
        })
    },

    /**
    Given a color in css color format - parse it into an r,g,b array
    @param {String} input - the color string. Ex: rgba(255,2,2), #fff, #feabcd
    @static
    */
    parseColor: function(input) {
        var m;
        m = input.match(/^#([0-9a-f]{3})$/i)
        if( !!m) {
            // in three-character format, each value is multiplied by 0x11 to give an
            // even scale from 0x00 to 0xff
            return [
                parseInt(m[1].charAt(0),16)*0x11,
                parseInt(m[1].charAt(1),16)*0x11,
                parseInt(m[1].charAt(2),16)*0x11
            ];
        }
        m = input.match(/^#([0-9a-f]{6})$/i);
        if( !!m) {
            return [
            parseInt(m[1].substr(0,2),16),
            parseInt(m[1].substr(2,2),16),
            parseInt(m[1].substr(4,2),16)
            ];
        }
        m = input.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
        if( !!m) {
            return [m[1],m[2],m[3]];
        }
    },

    /**
    Given a url, add query string parameters to it
    @param {String} url - the url to add query string parameters to
    @param {Object} params - The query string parameters to add
    @returns {String} - the new url with the query string parameters added
    */
    addQueryString: function(view,obj) {
        var i = view.indexOf('?');
        if (i < 0) view += '?';
        else if (i < view.length-1) view += '&';
        return view + $.param(obj);
    },

    showProcessDialog: function(hr) {
        var key = $(hr).attr('ok');
        var ot = $(hr).attr('ot');
        var app = $(hr).attr('app');
        if (!app) app = 'System';
        ServiceDesk.loadRemoteFormInLayer(app,'process.popup',{'ObjectKey':key,'ObjectType':ot});
    }
    ,urlFragment: function(key){
        var query = location.hash.split('#!')[1] || '';
        var re = /([^&=]+)=?([^&]*)/g;
        var decodeRE = /\+/g;  // Regex for replacing addition symbol with a space
        var decode = function (str) {return decodeURIComponent( str.replace(decodeRE, " ") );};
        var params = {}, e;
        while ( e = re.exec(query) ) {
            var k = decode( e[1] ), v = decode( e[2] );
            if (k.substring(k.length - 2) === '[]') {
                k = k.substring(0, k.length - 2);
                (params[k] || (params[k] = [])).push(v);
            }
            else params[k] = v;
        }
        if (typeof key == 'undefined') return params;
        return params[key];
    }
    ,setUrlFragment: function(obj) {
        obj = obj || {};
        var qs = $.param(obj);
        if (!!history && !!history.replaceState) {
            var fragment = '#!' + qs;
            history.replaceState(null,null,fragment);
        }
    },

    /**
    Get an object containing all scoped parameters
    @param {String} scopeid - the scope for which parameters should be retrieved
    @returns {object} - The parameters as an object
    */
    allScopedParameters: function(xid) {
        var fid = xid  + '__parameters__';
        var field = $$(fid);
        if (!field.exists()) return {};
        try {
            return JSON.parse(field.val());
        } catch(e) {
            return {};
        }
    },

    /**
    Get or set a scope parameter for the given scope
    @param {String} scopeid - the scope in which this parameter should be read/written
    @param {String} key - The parameter key to retrieve
    @param {String} [value]  - The parameter value to set.

    @returns {object} - The value of the parameter

    @static
    */
    scopedParameter: function(xid,key,value) {
        var fid = xid  + '__parameters__';
        var field = $$(fid);
        var can_write = !(typeof value == 'undefined');
        if (!field.exists()) {
            if  (!can_write) {
                return null;
            }

            var p = $('<input type="hidden" />').attr('id',fid);
            $('body').append(p);
            field = p;
        }

        var data = field.val();
        if (!data) {
            data = {};
        } else {
            try {
                data = JSON.parse(data);
            } catch(e) {
                data = {};
            }
        }

        if (!can_write)
            return data[key];
        data[key] = value;
        field.val(JSON.stringify(data));
        return value;
    },

    /**
    Register a function for a given xid scope
    @param {String} key - the scope in which this function should be registered
    @param {String} name - the name of the function
    @param {Function} func - the function to register
    @static
    */
    registerScopeFunction: function(key,name,func) {
        key = key || 'global';
        if (!window.xscopes) window.xscopes = {};
        if (!window.xscopes[key]) window.xscopes[key] = {};
        window.xscopes[key][name] = func;
    },

    /**
    Execute a function that was registered in a given scope using ServiceDesk#registerScopeFunction
    @param {String} key - the scope in which this function was registered
    @param {String} name - the name the function was registered with
    @param {...Object} args - Any additional arguments to pass to the function
    @static
    */
    executeScopeFunction: function(key,name) {
        key = key || 'global';
        if (!window.xscopes) return;
        if (!window.xscopes[key]) return;
        var func = window.xscopes[key][name];
        if (!func) return;
        return func.apply(this,_.rest(arguments,2));
    },

    /**
    Broadcast a signal - optionally specify the id of the broadcaster
    @param {String} msg - The message to be broadcasted
    @param {String} [id] - An optional id that identifies the broadcaster
    @static
    */
    broadcast: function(msg,id) {
        if (!!id)
            $(ServiceDesk).trigger(msg,[id]);
        else
            $(ServiceDesk).trigger(msg);
    },

    /**
    Trigger download of an excel sheet that has data from the specified service
    @param {String} app - The app that contains the service
    @param {String} service - The service name
    @param {Object} parameters - Any additional parameters to pass to the service
    @param {String} parameters.filename - The filename to assign to the excel sheet (without the extension)
    @param {String} parameters.columns - A comma-seperated list of columns to include in results. If empty, all will be shown (except __rowid__, __key__ and __rowid_alias__)
    */
    exportToExcel: function(app,action,parameters) {
        var url = ServiceDesk.serviceUrl(app,action);
        parameters = parameters || {};
        parameters.__format__ = 'excel';
        parameters.__filename__ = (parameters.filename || 'report') + '.xlsx';
        parameters.__sc__ = __token__;
        parameters.__excelcols__ = (parameters.columns || '');
        parameters.__bulkimportschema__ = (parameters.bulkimportschema || '');
        url += '?' + $.param(parameters);
        location.href = url;
    },
    /**
    Show metadatamaps that have an extension attribute matching the specified object type.
    The object type is specified as the 'ot' attribute in the passed in DOM element

    @param {HTMLElement} hr - The element that was clicked on to request the list of maps. Must have an ot attribute
    specifying the object type to look for maps for
    */
    showExtensionMaps: function(hr) {
        var ot = $(hr).attr('ot');
        var ok = $(hr).attr('ok');
        var oid = $(hr).attr('oid');
        if (ot=='') {
            alert('No object type specified. Please contact your vendor.');
            return;
        }
        if (xint(ok)==0) {
            alert('No object key specified. Please contact your vendor.');
            return;
        }

        var id = '__mapextension_' + ot + '__';
        if (!ServiceDesk._mpe) ServiceDesk._mpe = {};
        if (!ServiceDesk._mpi) ServiceDesk._mpi = {};

        if (!ServiceDesk._mpe[id]) {
            var groups = [
                {name:'',items:[{text:'Loading items...',href:'#'}]}
            ];
            ServiceDesk.renderMenu(hr,id,groups);
            ServiceDesk.executeService('System','MetadataMap:ExtensionModels',{'ObjectType':ot,'ObjectKey':ok},function(data){
                console.log('HERE WE GO:' + data)
                ServiceDesk._mpe[id] = data.Models;
                ServiceDesk._mpi[id] = data.Instances;
                ServiceDesk.showExtensionMaps(hr);
            },function(err){
                alert('An error occurred while loading metadata map information:' + err);
                return;
            });
        } else {
            var maps = ServiceDesk._mpe[id] || [];
            var instances = ServiceDesk._mpi[id] || [];
            var groups = [];
            for(var i=0;i<maps.length;i++) (function(){
                var items = [];
                var map = maps[i];
                var name = map.Name;
                var key = map.Key;
                for(var j=0;j<instances.length;j++) {
                    var instance = instances[j];
                    if (String.matches(instance.ModelName,name)) {
                        var item = {
                            text:instance.Name
                            ,app:'System'
                            ,view:'mapinstance?key=' + instance.Key
                        };
                        items.push(item);
                    }
                }
                if (items.length==0) {
                    items.push({
                        text: 'New ' + name
                        ,click: function(evnt) {
                            var args = {
                                'mapkey':key
                            };
                            args[ot] = ok
                            args[ot + '_id'] = oid
                            ServiceDesk.loadRemoteFormInLayer('System','createmetadatamapinstance.partial',args,function(data){
                                var ik = data[0].ObjectKey;
                                location.href = ServiceDesk.appUrl('System/mapinstance?key=' + ik);
                            });
                        }
                    });
                }
                var group = {
                    name:map.Name
                    ,items:items
                };
                groups.push(group);
            })();
            if (groups.length==0) {
                groups.push({
                    name:'No Models'
                    ,items:[]
                });
            }
            ServiceDesk.renderMenu(hr,id,groups);
        }
    },

    /**
    Subscribe to a message that may be broadcasted.
    @param {String} msg - The message to subscribe to
    @param {String} [id] - id of the subscriber. If this id matches the id of the broadcaster, the callback will not be executed (assuming the broadcaster also sent his id as well)
    @param {Function} callback - A function to call when the message is broadcasted.
    @static
    */
    subscribe: function(/*msg,id,func*/) {
        var msg = arguments[0];
        var id = null;
        var func = null;
        if (arguments.length==2) {
            func = arguments[1];
        }
        if (arguments.length==3) {
            id = arguments[1];
            func = arguments[2];
        }
        if (!func) return;
        if (!!id) {
            $(ServiceDesk).bind(msg,function(e,i){
                if (i===id) return;
                func();
            });
        } else {
            $(ServiceDesk).bind(msg,function(){
                func();
            });
        }
    }
    ,loadTimeZoneInfo: function(tz,callback){
        if (typeof __TZINFO__ == 'undefined') {
            __TZINFO__ = null;
        }
        tz = tz || 'UTC';
        callback = callback || function(){};

        function get_tz_info(timezone) {
            var zones = __TZINFO__ || [];
            return _.find(zones,function(x){
                return String.matches(timezone,x.Code);
            })
        }

        if (!__TZINFO__) {
            ServiceDesk.executeService('System','AllTZInfo',{},function(data){
                __TZINFO__ = data;
                callback(get_tz_info(tz));
            },function(err){
                console.log('Error loading tz info:' + err);
            });
        } else {
            callback(get_tz_info(tz));
        }
    }
    ,getDialogLayer: function(){
        var dialog_layer = $('.sd-alert-dialog-layer');
        if (!dialog_layer.exists()) {
            dialog_layer = $('<div class="sd-alert-dialog-layer" />');
            $('body').append(dialog_layer);
        }
        return dialog_layer;
    }
    /* Called after closing the dialog box. If the layer is empty, hidde it */
    ,updateDialogLayer: function() {
        var layer = ServiceDesk.getDialogLayer();
        if (layer.is(':empty')) {
            layer.makeInvisible();
        } else {
            layer.makeVisible();
        }
    }
    ,createAlertBox: function() {
        var d = $('<div />').addClass('sd-alert');
        $('<div class="title" />').appendTo(d);
        $('<div class="closer" />').appendTo(d);
        $('<div class="message" />').appendTo(d);
        var actions = $('<div class="actions clearfix" />');
        $('<div class="lactions" />').appendTo(actions);
        $('<div class="cactions" />').appendTo(actions);
        $('<div class="ractions" />').appendTo(actions);
        d.append(actions);
        var layer = ServiceDesk.getDialogLayer();
        layer.append(d);
        return d;
    }
    ,confirm: function(opts) {
        if (!opts) return;
        var box = ServiceDesk.createAlertBox();
        var cs = 'colorscheme9';
        if (!!opts.warning) cs = 'colorscheme12';

        if (!!opts.colorscheme) cs = opts.colorscheme;
        css = cs + ' ' + (!!opts.css?opts.css:'');
        box.addClass(css);
        var message = opts.message;
        box.find('.message').text(message);
        if (!!opts.warning) box.find('.message').addClass('warning');
        var closeme = function() {
            box.remove();
            ServiceDesk.updateDialogLayer();
        };
        if (!!opts.title) box.find('.title').text(opts.title);
        var actions = opts.actions || [];

        if (actions.length==0) {
            actions.push({
                title:'OK'
                ,close: true
            });
        }

        _.each(actions,function(action){
            var cancel = !!action.cancel;
            var msg = action.title;
            var cb = action.callback;
            var b = $('<button />');


            b.text(msg).addClass(cancel?'cancel-action':'normal-action');
            b.addClass('alert-action');
            b.touchClick(function(evnt){
                evnt.preventDefault();
                if (!!cb) {
                    cb(b,closeme);
                }
                if (!!opts.autoclose || !!action.close)
                    closeme();
            });

            var action_box = '.cactions';
            if (action.align=='right') action_box = '.ractions';
            if (action.align=='left') action_box = '.lactions';
            var action_container = box.find(action_box);
            b.appendTo(action_container);

        });
        $(box).center({mobilePos:'top'});
        ServiceDesk.updateDialogLayer();
    },

    disableAction: function(ctrl) {
        var loader = $('<div />').addClass('loading_small').css('display','inline-block');
        var w = $(ctrl).width();
        loader.width(w);
        var disp = $(ctrl).css('display');
        var show_action = function() {
            $(ctrl).css('display',disp);
            $(ctrl).removeAttr('disabled','disabled');
        }
        var hide_action = function() {
            $(ctrl).css('display','none');
            // $(ctrl).attr('disabled','disabled');
        }


        /*
        var invoked_ctrl = $(ctrl).get(0);
        if (!!invoked_ctrl) {
            if (invoked_ctrl.nodeName == 'BUTTON' || invoked_ctrl.nodeName == 'INPUT') {
                hide_action = function() {
                    $(ctrl).attr('disabled','disabled');
                }
                show_action = function() {
                    $(ctrl).removeAttr('disabled');
                }
            }
        }
        */
        loader.insertAfter($(ctrl));
        hide_action();
    },
    jsonHelper: {
        sort: function (inputStr, sparePlainArray, spaces) {
            return jsonabc.sort(inputStr, sparePlainArray, spaces);
        }
    }
}


ServiceDesk.__AppMessages__ = {};
ServiceDesk.registerChangeEvent = ServiceDesk.registerFieldChange;
ServiceDesk.pendingNotificationCount = 0;
ServiceDesk.MAX_OID_LENGTH = 15;

function random(start, stop) {
    return (Math.round(Math.random() * (stop - start))) + start - 1;
}
var __skipNegotiation = true;
if (typeof __SREnableNegotiation__ != 'undefined') {
    if (__SREnableNegotiation__) {
        __skipNegotiation = false;
    }
}
ServiceDesk.MessageBus = {
    subscriptions: {},
    initialized: false,
    startedInitialization: false,
    initQueue: [],
    lucyHubInitialized: false,
    lucyHubStartedInitialization: false,
    globalHub: new signalR.HubConnectionBuilder().withUrl('/globalhub',{
        skipNegotiation: __skipNegotiation,
        transport:__skipNegotiation?signalR.HttpTransportType.WebSockets:signalR.HttpTransportType.None
    }).configureLogging(signalR.LogLevel.Debug).build(),
    lucyHub: new signalR.HubConnectionBuilder().withUrl('/lucyhub',{
        skipNegotiation: __skipNegotiation,
        transport:__skipNegotiation?signalR.HttpTransportType.WebSockets:signalR.HttpTransportType.None
    }).configureLogging(signalR.LogLevel.Debug).build(),

    start: async function(connection, errors) {
        try {
            await connection.start();
            console.log('connected');
        } catch (err) {
            var initialTimeout = 1000;
            var timeout = 0;
            errors = errors || 0;

            // Trying out exponential backoff for reconnects
            // https://en.wikipedia.org/wiki/Exponential_backoff
            if(errors == 0) {
                timeout = initialTimeout;
                console.log(`[${new Date().toISOString()}]`, `1st error, timeout: ${timeout}`);
            }
            else if(errors == 1) {
                timeout = initialTimeout * 2;
                console.log(`[${new Date().toISOString()}]`, `2nd error, timeout: ${timeout}`);
            }
            else if(errors == 3) {
                timeout = random(0, Math.pow(2, 3)) * initialTimeout;
                console.log(`[${new Date().toISOString()}]`, `3rd error, timeout: ${timeout}`);
            }
            else {
                timeout = random(0, Math.pow(2, errors)) * initialTimeout;
                console.log(`[${new Date().toISOString()}]`, `errors: ${errors}, timeout: ${timeout}`);
            }

            console.error(`[${new Date().toISOString()}]`, err);
            setTimeout(() => ServiceDesk.MessageBus.start(connection, errors + 1), timeout);
        }
    },

    initLucyHub: function(cb) {
        cb = cb || function(){};

        if (!!signalR) {
            if (ServiceDesk.MessageBus.lucyHubInitialized) {
                cb();
                return;
            }

            var connection = ServiceDesk.MessageBus.lucyHub;

            if(!!connection) {
                if (!ServiceDesk.MessageBus.lucyHubStartedInitialization) {
                    connection.serverTimeoutInMilliseconds = 30000;

                    connection.on('logger', ServiceDesk.OI.monitorLogger);

                    // Handle disconnects
                    connection.onclose(async () => {
                        await ServiceDesk.MessageBus.start(connection);
                    });

                    console.info(`[${new Date().toISOString()}]`, 'Starting connection to lucy hub');
                    connection.start().then(() => {
                        console.info(`[${new Date().toISOString()}]`, 'connected to lucy hub')
                        ServiceDesk.MessageBus.lucyHubInitialized = true;
                        cb();
                    })
                    .catch(err => console.error(err));

                    ServiceDesk.MessageBus.lucyHubStartedInitialization = true;
                }
            }
        }
    },

    init: function(cb) {
        cb = cb || function(){};

        if (!!signalR) {
            if (ServiceDesk.MessageBus.initialized) {
                cb();
                return;
            }

            ServiceDesk.MessageBus.initQueue.push(cb);

            var connection = ServiceDesk.MessageBus.globalHub;

            if(!!connection) {
                if (!ServiceDesk.MessageBus.startedInitialization) {
                    connection.serverTimeoutInMilliseconds = 30000;

                    connection.on('broadcast', (channel, message) => {
                        var subscriptions = ServiceDesk.MessageBus.subscriptions;

                        if (!!subscriptions[channel]) {
                            _.each(subscriptions[channel],function(f){
                                f(message,channel);
                            });
                        }
                    });

                    // Handle disconnects
                    connection.onclose(async () => {
                        await ServiceDesk.MessageBus.start(connection);
                    });
                    
                    console.info(`[${new Date().toISOString()}]`, 'Staring connection to global hub');
                    connection.start().then(() => {
                        console.info(`[${new Date().toISOString()}]`, 'connected to global hub');
                        ServiceDesk.MessageBus.initialized = true;

                        _.each(ServiceDesk.MessageBus.initQueue,function(f){
                            f();
                        });

                        ServiceDesk.MessageBus.initQueue = [];
                    })
                    .catch(err => console.error(err));

                    ServiceDesk.MessageBus.startedInitialization = true;
                }
            }
        }
    },

    getToken: function() {
        return __token__ || '';
    },

    hub: function() {
        return ServiceDesk.MessageBus.globalHub;
    },

    subscribe: function(channel,handler) {
        var hub = ServiceDesk.MessageBus.hub();
        var subscriptions = ServiceDesk.MessageBus.subscriptions;

        if (!subscriptions[channel]) {
            subscriptions[channel] = [];
            var token = ServiceDesk.MessageBus.getToken();
            
            console.info(`[${new Date().toISOString()}]`, `subscribing to global hub channel: ${channel}`);

            hub.invoke('subscribe',token,channel).catch(err => console.error(err));
        }
        subscriptions[channel].push(handler);
    },

    publish: function(channel, message) {
        var hub = ServiceDesk.MessageBus.hub();
        var token = ServiceDesk.MessageBus.getToken();

        console.info(`[${new Date().toISOString()}]`, `publishing to global hub channel: ${channel}`);
        hub.invoke('broadcast',token,channel,message).catch(err => console.error(err));
    },
    
    unsubscribe:function(channel) {
        var hub = ServiceDesk.MessageBus.hub();

        var subscriptions = ServiceDesk.MessageBus.subscriptions;

        if (!!subscriptions[channel]) {
            var token = ServiceDesk.MessageBus.getToken();
            console.info(`[${new Date().toISOString()}]`, `unsubscribing from global hub channel: ${channel}`);
            hub.invoke('unsubscribe',token,channel).catch(err => console.error(err));
            delete subscriptions[channel];
        }
    }
};
ServiceDesk.OI = {
    _execute: function(path,params,ok,nope) {
        var apikey = __token__ || '';
        $.ajax({
            type: 'post',
            url: path,
            data: JSON.stringify(params || {}),
            contentType:'application/json',
            headers: {'Authorization':apikey},
            dataType: 'json',
            success: function(data) {
                if (!!ok) ok(data);
            },
            error: function(request,status,_e) {
                if (!!nope)
                    nope(request.responseText,request,status,_e);
            },
        });
    },
    executeInstanceAction: function(model, action, instance, parameters,ok,nope) {
        parameters = parameters || {};
        var url = ServiceDesk.createUrl('OI/' + model + '/' + action + '/' + xint(instance));
        ServiceDesk.OI._execute(url,parameters,ok,nope);
    },
    executeModelAction: function(model, action,parameters,ok,nope) {
        parameters = parameters || {};
        var url = ServiceDesk.createUrl('OI/' + model + '/' + action); 
        ServiceDesk.OI._execute(url,parameters,ok,nope);
    },
    monitorCallbacks: {},
    monitorHub: function() {
        return ServiceDesk.MessageBus.lucyHub;
    },
    monitorLogger: function(component,dt,category,message) {
        var monitorCallbacks = ServiceDesk.OI.monitorCallbacks;
        if (!!monitorCallbacks[component.toLowerCase()]) {
            _.each(monitorCallbacks[component.toLowerCase()],function(cb){
                cb(component,dt,category,message);
            });
        }

    },
    monitor: function(component,callback) {
        component = component.toLowerCase();
        var hub = ServiceDesk.OI.monitorHub();
        monitorCallbacks = ServiceDesk.OI.monitorCallbacks;
        ServiceDesk.MessageBus.initLucyHub(function(){
            hub.invoke('monitor',__token__,component)
                .then(() => {
                    if (!monitorCallbacks[component]) {
                        monitorCallbacks[component] = [];
                    }
                    /* remove old call backs */
                    monitorCallbacks[component] = [callback];
                })
                .catch(err => console.error(err));
        });

    },
    unmonitor: function(component) {
        component = component.toLowerCase();
        var hub = ServiceDesk.OI.monitorHub();
        hub.invoke('unmonitor',__token__,component)
            .then(() => ServiceDesk.OI.monitorCallbacks[component] = [])
            .catch(err => console.error(err));
    }
};
ServiceDesk.Lucy = ServiceDesk.OI;
ServiceDesk.ChartUtils = {
    parseDateTime: function(dt) {
        if (!dt) return null;
        if (!!dt.getFullYear) return dt;
        return ServiceDesk.parseDateTime(dt);
    },
    getDateGroupingInfo: function(start,end,data,field) {
        var out = {
            start:new Date()
            ,end: new Date()
            ,group: ''
            ,range: []
        };
        if (!!data && data.length > 0) {
            out.group = data[0]['DateGroup'];
        }
        if (!start || !end) {
            var dateRange = ServiceDesk.ChartUtils.getDateRangeFromData(data,field,out.group);
            if (!dateRange || dateRange.length==0) {
                dateRange = [new Date()];
            }
            out.start = dateRange[0];
            out.end = dateRange[dateRange.length-1];
            out.range = dateRange;
            return new ServiceDesk.ChartUtils.GroupInfo(out);
        }
        out.start = ServiceDesk.ChartUtils.parseDateTime(start);
        out.end = ServiceDesk.ChartUtils.parseDateTime(end);
        out.range = ServiceDesk.ChartUtils.getDateRange(start,end,out.group);
        return new ServiceDesk.ChartUtils.GroupInfo(out);
    },
    getDateLabel: function(dt,group) {
        dt = ServiceDesk.ChartUtils.parseDateTime(dt);
        switch(group) {
            default:
            case "D":
                return ServiceDesk.formatDate(dt);
            case "H":
                return dt.toString('HH');
            case "W":
                return 'Week ' + dt.getWeekOfYear();
            case "M":
                return dt.toString('MMM yyyy');
            case "Y":
                return dt.toString('yyyy');
        }

    },
    getDateLabels: function(range,group) {
        return _.map(range,function(x) {
            return ServiceDesk.ChartUtils.getDateLabel(x,group);
        });
    },

    getDateRangeFromData: function(data,dateField,group) {
        if (!data) {
            return [];
        }
        if (!dateField) {
            return [];
        }

        var dates = _.map(_.uniq(_.pluck(data,dateField)),function(dt){
            return ServiceDesk.ChartUtils.parseDateTime(dt);
        });

        if (dates.length == 0) {
            return [];
        }
        var start = dates[0];
        var end = dates[dates.length-1];
        return ServiceDesk.ChartUtils.getDateRange(start,end,group);
    },

    getDateRange: function(start,end,group) {
        start = ServiceDesk.ChartUtils.parseDateTime(start);
        end = ServiceDesk.ChartUtils.parseDateTime(end);
        if (end < start) {
            console.log('Dates swapped?',start,end);
            return [];
        }

        var results = [];
        var current = start.clone();

        if ((current - end == 0) && group == 'H') {
            /* wtf? clean this up */
            current.setHours(0);
            current.setMinutes(0);
            current.setSeconds(0);
            current.setMilliseconds(0);
            end = current.clone();
            end.setDate(current.getDate()+1);
            end.setSeconds(end.getSeconds()-1);
        }

        while( current <= end) {
            results.push(current.clone());
            console.log(current,group,end);
            switch(group.toUpperCase()) {
                default:
                case "D":
                current.setDate(current.getDate()+1);
                break;

                case "H":
                current.setHours(current.getHours()+1);
                break;
                case "W":
                current.setDate(current.getDate()+7);
                break;
                case "M":
                current.setMonth(current.getMonth()+1);
                break;
                case "Y":
                current.setFullYear(current.getFullYear()+1);
                break;

            }
        }
        return results;
    },
    fillEmptySlots: function(start,end,group,data,dateField,filler) {
        var dateGroups = _.groupBy(data,function(x){
            return ServiceDesk.ChartUtils.getDateLabel(x[dateField],group);
        });
        var range = ServiceDesk.ChartUtils.getDateRange(start,end,group);
        var items = [];
        for (var i = 0; i < range.length; i++) {
            var dt = range[i]
            var lbl = ServiceDesk.ChartUtils.getDateLabel(dt,group);
            items.push(filler(dateGroups[lbl] || [] ));
        };
        return items;
    }
};
ServiceDesk.ChartUtils.GroupInfo = function(opts) {
    this.start = opts.start;
    this.end = opts.end;
    this.range = opts.range;
    this.group = opts.group;
};
ServiceDesk.ChartUtils.GroupInfo.prototype.getDateLabels = function() {
    return ServiceDesk.ChartUtils.getDateLabels(this.range,this.group);
};
ServiceDesk.ChartUtils.GroupInfo.prototype.getDateLabel = function(dt) {
    return ServiceDesk.ChartUtils.getDateLabel(dt,this.group);
};
ServiceDesk.ChartUtils.GroupInfo.prototype.getNormalizedPoints =
function(data,dateField,filler,fillerField) {
    if (typeof filler != 'function') {
        if (String.matches(filler,'sum') || String.matches(filler,'sumwithbreak')) {
            if (!fillerField) {
                throw 'No summation field was specified';
            }

            var allowNulls = String.matches(filler,'sumwithbreak');

            filler = function(items) {
                if (allowNulls && (!items || items.length == 0)) {
                    return null;
                }
                var total = 0.0;
                for(var i=0;i<items.length;i++) {
                    total += xnum(items[i][fillerField]);
                }
                return total;
            }
        } else if (String.matches(filler,'firstobject') ) {
            if (!fillerField) {
                throw 'No summation field was specified';
            }

            filler = function(items) {
                if ((!items || items.length == 0)) {
                    return null;
                }
                var data = {
                    y:xnum(items[0][fillerField]),
                    data: items[0]
                }
                return data;
            }
        } else {
            throw 'Unknown slot filler:' + filler;
        }
    }
    return ServiceDesk.ChartUtils.fillEmptySlots(
        this.start,
        this.end,
        this.group,
        data,
        dateField,
        filler);
};

/**
Fires the loading/spinner animation on an element
@param {jquery} elm - the element to show the spinner on
*/
ServiceDesk.startLoading = function(elm) {
    if (!elm) return;
    elm = $(elm).first();
    if (!elm.exists()) return;
    elm.addClass('loading');
};

/**
Stops the loading/spinner animation on an element
@param {jquery} elm - the element to stop the spinner on
*/
ServiceDesk.doneLoading = function(elm) {
    if (!elm) return;
    elm = $(elm).first();
    elm.removeClass('loading');
};

/**
@class TruncatedObject
@property {String} truncated - the truncated   portion of the object id
@property {String} rest - the untruncated portion of the object id
*/
/**
Contract an object in dot notation (A.B.C.D) to a maximum of 15 characters.
The left portion is truncated with an ellipsis
@param {String} oid - the object id to be truncated
@returns {TruncatedObject}
*/
ServiceDesk.contractObjectID = function(oid) {
    var result = {'truncated':'','rest':''};
    var max_len = ServiceDesk.MAX_OID_LENGTH;
    if (oid.length <= max_len) {
        result.rest = oid;
        return result;
    }
    var parts = oid.split('.');
    var l = 0;
    var i = parts.length - 1;
    var truncated = '';
    var rest = '';
    for(;i>=0;i--) {
        if (l > max_len) {
            truncated = parts[i] + '.' + truncated;
            continue;
        }
        rest = parts[i] + '.' + rest;
        l += parts[i].length + 1;
    }
    result.truncated = truncated.replace(/^\.+|\.$/g,'');
    result.rest = rest.replace(/^\.+|\.$/g,'');
    return result;
};
/**
Contract an object in dot notation (A.B.C.D) to a maximum of 15 characters.
The left portion is truncated with an ellipsis. Similar to {@link ServiceDesk#contractObjectID} but returns only the untrimmed portion
@param {String} oid - the object id to be truncated
@returns {String}
*/
ServiceDesk.contractObjectIDToText = function(oid) {
    var r = ServiceDesk.contractObjectID(oid);
    if (!!r.truncated) return '...' + r.rest;
    return r.rest;
};
ServiceDesk.loadHelp = function(app,view) {
    var url = ServiceDesk.appUrl('System/help')
    window.open(url,'videoWindow','height=560,width=1100,left=10,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes');
    return;
}
ServiceDesk.getDocUrl = function(app,view) {
    var url = ServiceDesk.accountUrl('Docs/' + app + '/' + view);
    if (
        _.startsWith(view.toUpperCase(),'HTTP:')
        || _.startsWith(view.toUpperCase(),'HTTPS:')
        || _.startsWith(view.toUpperCase(),'//')
    ) {
        url = view;
    }
    return url;

}
ServiceDesk.loadDocumentation = function(app,view) {
        var url = ServiceDesk.getDocUrl(app,view);
        window.open(url,'docWindow','height=640,width=1240,left=10,top=10,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,directories=no,status=yes');
        i_a.track('Open Doc',{url:url});
        return;
        var seed_id = '__doc__' + app+"_" + view;
        var layer = ServiceDesk.getEmptyLayer(seed_id);
        layer.addClass('doc_layer');
        layer.css({
            'height':'80%'
            ,'width':'80%'
        });
        //makeVisible(layer);
        var f = $('<iframe />');
        f.attr('frameborder','0').css({
            'width':'100%'
            ,'height':'100%'
        });
        f.attr('src',url);
        $('.content',layer).append(f);
        ServiceDesk.showLayerMask();
        makeVisible(layer);
        layer.center();
        ServiceDesk.closeMenus();
        return;
    }
/**
This is a shorthand for {@link ServiceDesk#getField}
@function $SD
*/
var $SD = function(x) {
    return ServiceDesk.getField(x);
};


/**
Gets/sets the value of a given field
@function $SDV
@param {String} id - the id of the field you need the value of
@param {Object} [val] - optionally set the value of the field. Only called if the field has a setValue method
@returns {Object} the current value of the field
*/
var $SDV = function(x,k) {
    var f = $SD(x);

    if (!f) return null;

    if (typeof k == 'undefined')
        return f.getValue();

    if (!!f.setValue) {
        f.setValue(k);
        return k;
    }

    f.getValue();
};

var $M = function(msg) {
    msg = xstr(msg || '');
    if (!ServiceDesk.__AppMessages__) return '';
    return xstr(ServiceDesk.__AppMessages__[msg.toLowerCase()] || msg);
};
/**
Returns a localized version of the given text (as per logged-in user's locale)
@function $L
@param {String} msg - the text to be localized
@return {String} - localized text
*/
var $L = function(msg,obj) {
    msg = xstr(msg || '');
    obj = obj || {};
    if (!ServiceDesk.__AppMessages__) return msg;
    
    var lmsg = xstr(ServiceDesk.__AppMessages__[msg.toLowerCase()] || msg);
    if (Object.keys(obj).length > 0) {
        for(var key in obj) {
            lmsg = lmsg.replace('$' + key,obj[key]);
        }
    }
    return lmsg;
};

/**
Returns any data that has been serialized on the page.
Data can be serialized by setting serialize='true' on the service block in the view.
Returns the first row of results or a specific value if a field was specified
@function $Data
@param {String} name - the id of the service whose data is required
@return {String} [field] - if specified, return the value of this field
@return {Object[]|Object}
*/
var $Data = function(x,y) {
    if (!__ServiceData__[x] || !__ServiceData__[x].length) return null;
    var n =  __ServiceData__[x][0];
    if (typeof y == 'undefined' || y==null) return n;
    return n[y];
};
var _dump_metrics = function(category,pass) {
    if (!pass) pass = 0;
    var e = __page_metrics__[pass][category];
    r = [];
    _.each(e,function(value,key){
        r.push({
            'item':key
            ,'time':xint(value.time)
            ,'duration':xnum(value.value)
        })
    });
    console.table(r);
};
var iVivaClipboard;

/* Credit to: http://stackoverflow.com/questions/17527870/how-does-trello-access-the-users-clipboard */
iVivaClipboard = new ((function() {
  function _Class() {
    this.value = "";
    $(document).keydown((function(_this) {
      return function(e) {
        var _ref, _ref1;
        console.log('doin it');
        if (!_this.value || !(e.ctrlKey || e.metaKey)) {
          return;
        }
        if ($(e.target).is("input:visible,textarea:visible")) {
          return;
        }

        if (typeof window.getSelection === "function" ? (_ref = window.getSelection()) != null ? _ref.toString() : void 0 : void 0) {
          return;
        }
        if ((_ref1 = document.selection) != null ? _ref1.createRange().text : void 0) {
          return;
        }
        return _.defer(function() {
          var $clipboardContainer;
          $clipboardContainer = $("#clipboard-container");
          if (!$clipboardContainer.exists()) {
            $clipboardContainer = $('<div style="position:absolute;left:-2000px;top:-2000px;" id="clipboard-container"></div>')
            $('body').append($clipboardContainer);
          }
          $clipboardContainer.empty().show();
          return $("<textarea id='clipboard'></textarea>").val(_this.value).appendTo($clipboardContainer).focus().select();
        });
      };
    })(this));
    $(document).keyup(function(e) {
      if ($(e.target).is("#clipboard")) {
        return $("#clipboard-container").empty().hide();
      }
    });
  }

  _Class.prototype.set = function(value) {
    this.value = value;
  };

  return _Class;

})());


/* user analytics  */
var i_a = {
    initialized:false,
    acceptance:'',
    checkStatus:function(uk,cb) {
        if (i_a.acceptance==='1' && mixpanel.has_opted_in_tracking()) {
            cb(true);
            return;
        }
        if (i_a.acceptance === '0') {
            cb(false);
            return;
        }

        ServiceDesk.executeService('System','UserAnalyticsAcceptance:Details',{UserKey:uk},function(data){
            var acceptance = '';
            if (!!data && !!data[0] && !!data[0]['Accepted']) {
                acceptance = data[0]['Accepted'];
            }
           
            if (acceptance === '') {
               

                cb(true);
                return;
            }
            if (acceptance === '0') {
               cb(false);
                return;
            }
            if (acceptance === '1') {
               
                cb(true);
            }
        });
    },
    _init: function(uk,cb) {
        if (i_a.acceptance==='1' && mixpanel.has_opted_in_tracking()) {
            cb();
            return;
        }
        if (i_a.acceptance === '0') {
            return;
        }

        ServiceDesk.executeService('System','UserAnalyticsAcceptance:Details',{UserKey:uk},function(data){
            var acceptance = '';
            if (!!data && !!data[0] && !!data[0]['Accepted']) {
                acceptance = data[0]['Accepted'];
            }
            i_a.acceptance = acceptance;
            if (acceptance === '') {
                if (!mixpanel.has_opted_in_tracking()) {
                    mixpanel.opt_in_tracking();
                }
                

                //Not required as per TOS
                //i_a.askPermission(uk,cb);
                i_a.acceptance = '1';

                cb();
                return;
            }
            if (acceptance === '0') {
                /* not permitted. go away */
                return;
            }
            if (acceptance === '1') {
                if (!mixpanel.has_opted_in_tracking()) {
                    mixpanel.opt_in_tracking();
                }
                cb();
            }
        });
        
    },

    enabled: function() {
        return !!__i_a_enabled__;
    },

    askPermission:function(uk,can,cb) {
        var x = !!can;
        var a = '0';
        if (!!x) {
            a = '1';
        }
        
        ServiceDesk.executeService('System','UserAnalyticsAcceptance:Update',{UserKey:uk,'Accepted':a},function(){
            i_a.acceptance = a;
            if (a=='1') {
                if (!mixpanel.has_opted_in_tracking()) {
                    mixpanel.opt_in_tracking();
                }
            } else {
                if (mixpanel.has_opted_in_tracking()) {
                    mixpanel.opt_out_tracking();
                }
            }
            cb(a=='1');
        });
    },

    init:function(cb) {
        if (!i_a.enabled()) return;
        var uk = __loggedin_user_key__;
        if (xint(uk)==0) return;
        var cb2 = function(){
            
            var ue = __loggedin_useremail__;
            var un = __loggedin_username__;
            var account = __account__;
            if (xint(uk)>0) {
                mixpanel.identify(account+":"+uk);
                mixpanel.people.set_once({
                    "$email":ue,
                    "name":un,
                    'account':account
                });
            }
            cb();
        }
        i_a._init(uk,cb2);
    },
    runCommand:function(cb) {
        if (!i_a.enabled()) return;
        if (i_a.acceptance === '0') return;
        if (i_a.initialized) {
            cb();
        } else {
            i_a.init(cb);
        }
    },

    track:function(msg,obj) {
        i_a.runCommand(function(){
            mixpanel.track(msg,obj);
        });
    },
    trackLink:function(selector,msg,obj) {
        i_a.runCommand(function(){
            mixpanel.track_links(selector,msg,obj);
        });
    }
};
