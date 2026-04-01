(function() {
  var Guides, UserPrefs, checkOrientation, currentView, getItem, getRemoteUserItem, getUserItem, hasLocalStorage, isElementViewable, isiPad, loggedInUser, root, setItem, setRemoteUserItem, setUserItem, tip;

  tip = function(x) {
    return alert(x);
  };

  isiPad = function() {
    return navigator.userAgent.match(/iPad/i) !== null;
  };

  hasLocalStorage = function() {
    return typeof localStorage !== 'undefined';
  };

  getItem = function(key) {
    var obj;
    if (hasLocalStorage()) {
      obj = localStorage.getItem(key);
      return JSON.parse(obj);
    }
    return '';
  };

  setItem = function(key, val) {
    if (hasLocalStorage()) {
      return localStorage.setItem(key, JSON.stringify(val));
    }
  };

  checkOrientation = function() {
    var check_again;
    if (isiPad()) {
      if (getItem('ipad-orientation-check') === '1') {
        return;
      }
      if ((window.orientation != null) && window.orientation === 0) {
        check_again = function() {
          if ((window.orientation != null) && window.orientation === 0) {
            setItem('ipad-orientation-check', '1');
            return tip('Turn your iPad sideways for a better experience!');
          }
        };
        return setTimeout(check_again, 2000);
      }
    }
  };

  getUserItem = function(key, type) {
    var account, json;
    if (hasLocalStorage()) {
      account = (typeof __account__ !== "undefined" && __account__ !== null ? __account__ : "").toLowerCase();
      json = localStorage.getItem('account:' + account + ':user:' + key + ':' + type);
      return JSON.parse(json);
    }
  };

  setUserItem = function(key, type, val) {
    var account;
    if (hasLocalStorage()) {
      account = (typeof __account__ !== "undefined" && __account__ !== null ? __account__ : "").toLowerCase();
      return localStorage.setItem('account:' + account + ':user:' + key + ':' + type, JSON.stringify(val));
    }
  };

  getRemoteUserItem = function(key, type, cb) {
    var params;
    params = {
      UserKey: key,
      Type: type
    };
    return ServiceDesk.executeService('System', 'UserPrefData:UserData', params, function(data) {
      var setting;
      if (!data) {
        return;
      }
      if (data.length === 0) {
        return;
      }
      if (!data[0].Data) {
        return;
      }
      setting = JSON.parse(data[0].Data);
      setUserItem(key, type, setting);
      return cb(setting);
    });
  };

  setRemoteUserItem = function(key, type, data) {
    var params;
    params = {
      UserKey: key,
      Type: type,
      Data: JSON.stringify(data)
    };
    setUserItem(key, type, data);
    return ServiceDesk.executeService('System', 'UserPrefData:SetUserData', params, function(data) {
      return console.log('Synced user data for', type);
    });
  };

  loggedInUser = function() {
    if (typeof __loggedin_user_key__ === 'undefined') {
      return null;
    }
    if (!!__loggedin_user_key__) {
      return __loggedin_user_key__;
    }
    return null;
  };

  currentView = function() {
    if (!__app__) {
      return;
    }
    if (!__view__) {
      return;
    }
    return __app__ + '.' + __view__;
  };

  isElementViewable = function(elem) {
    var docViewBottom, docViewTop, elemBottom, elemTop, parent, pos, x;
    elem = $(elem);
    if (!elem.is(':visible')) {
      return false;
    }
    parent = $(elem).closest('.results');
    if (!parent.exists()) {
      return true;
    }
    pos = $(parent).position();
    docViewTop = pos.top;
    docViewBottom = docViewTop + $(parent).height();
    elemTop = $(elem).position().top;
    elemBottom = elemTop + $(elem).height();
    x = (elemBottom <= docViewBottom) && (elemTop >= docViewTop);
    if (x) {
      console.log($(elem), docViewTop, docViewBottom, elemTop, elemBottom);
    }
    return x;
  };

  UserPrefs = {
    clearAll: function(key) {
      if (hasLocalStorage()) {
        return localStorage.clear();
      }
    },
    getLocalData: function(key) {
      return getUserItem(loggedInUser(), key);
    },
    setLocalData: function(key, val) {
      return setUserItem(loggedInUser(), key, val);
    },
    getData: function(key, cb) {
      var data, uk;
      uk = loggedInUser();
      if (!uk) {
        return;
      }
      data = getUserItem(uk, key);
      if (!!data) {
        cb(data);
        return;
      }
      return getRemoteUserItem(uk, key, function(data) {
        return cb(data);
      });
    },
    setData: function(key, data) {
      var uk;
      uk = loggedInUser();
      if (!uk) {
        return;
      }
      setUserItem(uk, key, data);
      return setRemoteUserItem(uk, key, data);
    },
    saveColorSchemes: function() {
      var schemes, uk, view;
      uk = loggedInUser();
      if (!uk) {
        return;
      }
      view = currentView();
      if (!view) {
        return;
      }
      schemes = ServiceDesk.serializeColorSchemes();
      console.log('saving schemer', schemes);
      return UserPrefs.setData(view + ':colorscheme', schemes);
    },
    loadColorSchemes: function() {
      var uk, view;
      uk = loggedInUser();
      if (!uk) {
        return;
      }
      view = currentView();
      if (!view) {
        return;
      }
      return UserPrefs.getData(view + ':colorscheme', function(data) {
        return ServiceDesk.loadColorSchemes(data);
      });
    }
  };

  Guides = {
    hintElement: function(_id) {
      return '__hint__' + _id;
    },
    hideHint: function(_id) {
      return $$(Guides.hintElement(_id)).css('display', 'none');
    },
    hideHintElement: function(elm) {
      return elm.css('display', 'none');
    },
    showHintGroup: function(hg) {
      var hints;
      hints = $('[data-hint-group="' + hg + '"]');
      return Guides.showHintsForElements(hints);
    },
    showAllElementHints: function() {
      return Guides.showHintsForElements($('[data-hint-group]'));
    },
    hideAllElementHints: function() {
      return ServiceDesk.hideBubbles();
    },
    showHintsForElements: function(elements) {
      var element, hint_name, ids, _results;
      ids = {};
      elements.each(function() {
        var hg, hint_id, x;
        x = $(this);
        hg = x.data('hint-group');
        if (!isElementViewable(x)) {
          return;
        }
        hint_id = x.data('hint-id');
        if (ids[hg + '-' + hint_id] == null) {
          ids[hg + '-' + hint_id] = x;
          return console.log(x);
        }
      });
      _results = [];
      for (hint_name in ids) {
        element = ids[hint_name];
        _results.push(Guides.showHint(hint_name, {
          persist: false,
          content: element.data('hint'),
          link: element.data('hint-link'),
          position: element.data('hint-position') || 'top',
          element: element
        }));
      }
      return _results;
    },
    showHint: function(_id, opts) {
      var content, content_element, ctrl, dont_dismiss, f, frac, hint, hintpos, id, link, linkTag, offset, posoffset, size, style, _ref, _ref1;
      opts = opts || {};
      id = Guides.hintElement(_id);
      ctrl = opts.element;
      if (!(ctrl != null ? ctrl.is(':visible') : void 0)) {
        return;
      }
      style = opts.style || 'dark';
      size = opts.size || '';
      content = opts.content;
      link = opts.link || '';
      if (!content) {
        return;
      }
      hint = $$(id);
      if (!hint.exists()) {
        hint = $('<div />').addClass('guider ').addClass(style).addClass(size);
        hint.attr('id', id);
        $('<div />').addClass('pointer pointer_t').appendTo(hint);
        $('<div />').addClass('pointer pointer_l').appendTo(hint);
        $('<div />').addClass('pointer pointer_r').appendTo(hint);
        $('<div />').addClass('pointer pointer_b').appendTo(hint);
        $('<div />').addClass('content').appendTo(hint);
        $('<div />').addClass('link-container').appendTo(hint);
        $('body').append(hint);
        if (opts.maxWidth) {
          hint.css('max-width', opts.maxWidth);
        }
        if (!!opts.dismissable) {
          hint.touchClick(function(evnt) {
            evnt.preventDefault();
            return Guides.hideHint(_id);
          });
        }
      }
      hint.css({
        display: 'none',
        visibility: 'visible'
      });
      dont_dismiss = !!opts.persist;
      if (!dont_dismiss) {
        hint.addClass('bubble');
      } else {
        hint.removeClass('bubble');
      }
      content_element = hint.find('.content');
      content_element.empty();
      if (typeof content === 'function') {
        content(content_element);
      } else {
        content_element.text(content);
      }
      if (!!link) {
        linkTag = $('<a />');
        linkTag.text('More Details');
        linkTag.addClass('hint-link');
        linkTag.touchClick((function(_this) {
          return function(evnt) {
            evnt.stopPropagation();
            evnt.preventDefault();
            return $(ServiceDesk).trigger('hint-clicked', link);
          };
        })(this));
        hint.find('.link-container').empty().append(linkTag);
      }
      if (opts.contentIcon) {
        $('<span />').addClass('contenticon v3icon-' + opts.contentIcon).prependTo(content_element);
      }
      hint.find('.pointer').makeInvisible();
      if ($(ctrl).exists()) {
        frac = (_ref = opts.positionOffsetFraction) != null ? _ref : 0.5;
        posoffset = (_ref1 = opts.positionOffset) != null ? _ref1 : 0;
        if (posoffset > 0.0) {
          frac = 0.0;
        }
        offset = $(ctrl).offset();
        hintpos = offset;
        switch (opts.position) {
          case 'bottom':
            hint.find('.pointer_t').makeVisible();
            hintpos.left = offset.left + $(ctrl).width() * frac + posoffset - $(hint).outerWidth(true) * 0.5;
            hintpos.top = offset.top + $(ctrl).outerHeight();
            break;
          case 'right':
            hint.find('.pointer_l').makeVisible();
            hintpos.left = offset.left + $(ctrl).outerWidth();
            hintpos.top = offset.top + $(ctrl).height() * frac + posoffset - $(hint).outerHeight(true) * 0.5;
            break;
          case 'left':
            hint.find('.pointer_r').makeVisible();
            hintpos.top = offset.top + $(ctrl).height() * frac + posoffset - $(hint).outerHeight(true) * 0.5;
            hintpos.left = offset.left - $(hint).outerWidth(true);
            break;
          default:
            hint.find('.pointer_b').makeVisible();
            hintpos.left = offset.left + $(ctrl).width() * frac + posoffset - $(hint).outerWidth(true) * 0.5;
            hintpos.top = offset.top - $(hint).outerHeight(true);
        }
        hint.css({
          left: hintpos.left,
          top: hintpos.top
        });
        hint.fadeIn();
        if (opts.duration != null) {
          f = function() {
            return hint.fadeOut();
          };
          return setTimeout(f, opts.duration);
        }
      }
    }
  };

  $(function() {
    checkOrientation();
    return _.defer(function() {
      return UserPrefs.loadColorSchemes();
    });
  });

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.UserPrefs = UserPrefs;

  root.Guides = Guides;

}).call(this);
