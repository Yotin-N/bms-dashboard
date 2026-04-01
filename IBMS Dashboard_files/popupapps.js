(function() {
  var SDPopupApp, root, __PopupApps__;

  __PopupApps__ = {};

  $(document).ready(function() {
    return $('.popupapp').live('click', function() {
      var popup;

      popup = $(this).attr('popup');
      return SDPopupApp.invokeApp(popup, $(this));
    });
  });

  SDPopupApp = (function() {
    function SDPopupApp(id, config) {
      this.id = id;
      this.config = config;
      this.enabledApps = {};
      this.serviceUIMap = {};
      this.colors = ['F26522', '00A651', 'CCCC00', '2580D0', '9900CC'];
    }

    SDPopupApp.prototype.invoke = function(ctrl) {
      var key, ot, _ref;

      key = this.config.object_key;
      ot = (_ref = this.config.object_type) != null ? _ref : '';
      return ServiceDesk.loadViewInPopup(ctrl, this.config.app, this.config.view, {
        'popupid': this.id,
        'key': key,
        'ot': ot
      }, this.id);
    };

    SDPopupApp.prototype.isServiceEnabled = function(service) {
      return this.enabledApps[service.app + '.' + service.service] === '1';
    };

    SDPopupApp.prototype.enableService = function(service) {
      return this.enabledApps[service.app + '.' + service.service] = '1';
    };

    SDPopupApp.prototype.disableService = function(service) {
      return this.enabledApps[service.app + '.' + service.service] = '0';
    };

    SDPopupApp.prototype.populateLayerList = function(layer, id) {
      var create_cb, k, list, service, _fn, _i, _len, _ref,
        _this = this;

      layer = $(layer);
      create_cb = function(service, txt, id) {
        var cb, cb_container, legend, legend_error;

        cb = $('<input />').attr({
          'type': 'checkbox',
          'id': id,
          'name': id
        });
        legend = $('<span />').css({
          'background-color': '#' + _this.serviceColor(service)
        }).addClass('popup_legend_box');
        legend_error = $('<span />').append(ServiceDesk.createErrorIcon().attr('title', 'Too much data returned')).addClass('layer_error invisible');
        cb_container = $('<li />').append(legend).append(cb).append($('<label />').attr({
          'id': 'doit',
          'for': id
        }).text(txt));
        cb_container.append(legend_error);
        if (service.primary) {
          cb_container.css({
            'font-weight': 'bold'
          });
        }
        return [cb, cb_container];
      };
      list = $('<ul />').appendTo(layer);
      k = 0;
      _ref = this.config.services;
      _fn = function(service) {
        var cb, cb_container, _ref1;

        _ref1 = create_cb(service, service.title, service.app + '.' + service.service + '_' + k), cb = _ref1[0], cb_container = _ref1[1];
        k++;
        _this.serviceUIMap[service.app + "." + service.service] = cb_container;
        $(cb).attr('title', service.description);
        $(cb_container).attr('title', service.description);
        if (service.primary && (_this.enabledApps[service.app + '.' + service.service] == null)) {
          _this.enableService(service);
        }
        if (_this.isServiceEnabled(service)) {
          cb.attr({
            'checked': 'checked'
          });
        }
        list.append(cb_container);
        return cb.change(function() {
          var checked;

          checked = cb.is(':checked');
          if (checked) {
            _this.enableService(service);
          } else {
            _this.disableService(service);
          }
          return typeof _this._layerSelected === "function" ? _this._layerSelected(service, checked) : void 0;
        });
      };
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        service = _ref[_i];
        _fn(service);
      }
      return this.refreshList;
    };

    SDPopupApp.prototype.layerSelected = function(_layerSelected) {
      this._layerSelected = _layerSelected;
    };

    SDPopupApp.prototype.executeServices = function(pre_cb, post_cb, post_cb_error, final_cb, service_list, params) {
      var MAX, executeNext, self, services;

      self = this;
      services = service_list != null ? service_list : this.config.services;
      MAX = 101;
      if (params == null) {
        params = {};
      }
      if (params.max == null) {
        params.max = MAX;
      }
      executeNext = function(pos) {
        var k, service, service_params, v, _ref;

        if (pos >= services.length) {
          if (typeof final_cb === "function") {
            final_cb();
          }
          return;
        }
        service = services[pos];
        service_params = {};
        _ref = service.params;
        for (k in _ref) {
          v = _ref[k];
          service_params[v.name] = v.value;
        }
        _.extend(service_params, params != null ? params : {});
        if (typeof pre_cb === "function") {
          pre_cb(service);
        }
        return ServiceDesk.executeService(service.app, service.service, service_params, function(data) {
          var service_layer_ui, _ref1;

          service_layer_ui = (_ref1 = self.serviceUIMap[service.app + '.' + service.service]) != null ? _ref1.find('.layer_error') : void 0;
          if ((data != null ? data.length : void 0) >= MAX) {
            console.log('Too much data', data.length, service, service_layer_ui);
            if (service_layer_ui != null) {
              service_layer_ui.makeVisible();
            }
          } else {
            if (service_layer_ui != null) {
              service_layer_ui.makeInvisible();
            }
            if (typeof post_cb === "function") {
              post_cb(service, data);
            }
          }
          return executeNext(pos + 1);
        }, function(err) {
          if (typeof post_cb_error === "function") {
            post_cb_error(service, err);
          }
          return executeNext(pos + 1);
        });
      };
      return executeNext(0);
    };

    SDPopupApp.prototype.serviceIndex = function(service) {
      return _.indexOf(this.config.services, service);
    };

    SDPopupApp.prototype.serviceColor = function(service) {
      var i;

      i = this.serviceIndex(service);
      return this.colors[i % this.colors.length];
    };

    SDPopupApp.prototype.enabledServices = function() {
      var service, _i, _len, _ref, _results;

      _ref = this.config.services;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        service = _ref[_i];
        if (this.isServiceEnabled(service)) {
          _results.push(service);
        }
      }
      return _results;
    };

    SDPopupApp.prototype.serviceID = function(service) {
      return "" + service.app + "." + service.service;
    };

    return SDPopupApp;

  })();

  SDPopupApp.invokeApp = function(name, ctrl) {
    var app;

    app = __PopupApps__[name];
    if (app == null) {
      return;
    }
    return app.invoke(ctrl);
  };

  SDPopupApp.invokeAppDynamically = function(ctrl, panel_type, target, key, service_list) {
    var k, parameters, parts, s, service_params, services, v, _i, _len, _ref;

    parameters = {
      'target_app': target,
      'object_key': key,
      'object_type': target,
      'app': 'System',
      'view': panel_type + '.popup',
      services: []
    };
    __PopupApps__['System.' + panel_type + '.popup'] = new SDPopupApp('System.' + panel_type + '.popup', parameters);
    services = __PopupApps__['System.' + panel_type + '.popup'].config.services;
    for (_i = 0, _len = service_list.length; _i < _len; _i++) {
      s = service_list[_i];
      parts = parseAppUri(s.service);
      if (parts == null) {
        throw 'Invalid service specified:' + s;
      }
      service_params = [];
      _ref = s.params;
      for (k in _ref) {
        v = _ref[k];
        service_params.push({
          'name': k,
          'value': v
        });
      }
      services.push({
        'app': parts.app,
        'service': parts.service,
        'title': s.title,
        'description': s.description,
        params: service_params,
        primary: true
      });
    }
    return SDPopupApp.invokeApp('System.' + panel_type + '.popup', ctrl);
  };

  SDPopupApp.getCurrentApp = function(k) {
    var app, id;

    id = $(k).attr('popup');
    app = __PopupApps__[id];
    app.ObjectKey = app.config.object_key;
    app.ObjectType = app.config.object_type;
    return app;
  };

  SDPopupApp.registerHandler = function(event, func) {
    return $(SDPopupApp).bind(event + '.popup', func);
  };

  SDPopupApp.triggerHandler = function(event, args) {
    return $(SDPopupApp).trigger(event + '.popup', args);
  };

  SDPopupApp.flagHandlers = {};

  SDPopupApp.registerFlagHandler = function(app, func) {
    return SDPopupApp.flagHandlers[app] = func;
  };

  SDPopupApp.requestFlag = function(app, flag) {
    var _base;

    return typeof (_base = SDPopupApp.flagHandlers)[app] === "function" ? _base[app](flag) : void 0;
  };

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.__PopupApps__ = __PopupApps__;

  root.SDPopupApp = SDPopupApp;

}).call(this);
