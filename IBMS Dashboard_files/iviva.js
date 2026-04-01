'use strict';

const iviva = {
    showDialog: function(app, view, parameters, opts, cb) {
        ServiceDesk.loadRemoteFormInLayer(app, view, parameters, cb, opts);
    },

    getField: function(id) {
        return $SD(id);
    },

    getJqField: function(id) {
        return $$(id);
    },

    getFieldValue: function(id) {
        return $SDV(id);
    },

    setFieldValue: function(id, value) {
        return $SDV(id, value);
    },

    showField: function(id) {
        ServiceDesk.showField(id);
    },

    hideField: function(id) {
        ServiceDesk.hideField(id);
    },

    flashNotification: function(message) {
        ServiceDesk.flashNotification(message);
    },

    loadScript: function(url, callback) {
        let urls = [];
        let totalLoaded = 0;
        let scriptLoaded = function() {
            totalLoaded++;

            if(totalLoaded == urls.length) {
                callback();
            }
        };

        if(typeof url === 'string') {
            urls = [url];
        }
        else if(url.constructor.name === 'Array') {
            urls = url;
        }

        urls.forEach(function(url) {
            var script = document.createElement('script');
            script.type = 'text/javascript';

            if(script.readyState) { 
                script.onreadystatechange = function() {
                    if (script.readyState === 'loaded' || script.readyState === 'complete') {
                        script.onreadystatechange = null;
                        scriptLoaded();
                    }
                };
            } else { 
                script.onload = function() {
                    scriptLoaded();
                };
            }
        
            script.src = url;
            document.getElementsByTagName('head')[0].appendChild( script );
        });
    },
      
    messageBus: ServiceDesk.MessageBus,
      
    executeLucyAction: function(lucyModel, lucyAction, params, successCallback, failureCallback, lucyInstance) {
        params = params || {};
        let app = 'System';
        let service = 'MetadataMap:ExecuteAction';

        params['Instance.Name'] = lucyModel;
        params['Instance.Action'] = lucyAction;

        if(!!lucyInstance) {
            params['Instance.Key'] = lucyInstance;
            service = 'MetadataMap:ExecuteActionOnInstanceOrMap';
        }

        ServiceDesk.executeService(app, service, params, successCallback, failureCallback);
    },

    getData: function(id, field) {
        if (!__ServiceData__[id]) return null;

        let data = __ServiceData__[id];

        if(data.constructor.name === 'Array') {
            let first =  __ServiceData__[id][0];

            if(typeof field == 'undefined' || field == null) return first;

            return first[field];
        }

        if(typeof field == 'undefined' || field == null) return data;

        return data[field];
    },

    getAllData: function(id, field) {
        if (!__ServiceData__[id]) return null;

        let data = __ServiceData__[id];

        if(data.constructor.name === 'Array') {
            if(typeof field == 'undefined' || field == null) return data;

            return data.map(function(elem) {
                return elem[field];
            })
        }

        if(typeof field == 'undefined' || field == null) return data;

        return data[field];
    }
};