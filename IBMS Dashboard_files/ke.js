(function() {
  var ANIMATION_CURVE, ANIMATION_TIMEOUT, DEF_SPACING, EDGE_ALPHA, EDGE_OFFSET, GRID_SIZE, ImageCache, KE, NODE_ALPHA, NODE_SIZE, SVG_SIZE, loadImage, randomColor, root, wrapText,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  NODE_SIZE = 30;

  GRID_SIZE = 300;

  DEF_SPACING = 2;

  SVG_SIZE = 512;

  NODE_ALPHA = 0.2;

  EDGE_ALPHA = 0.05;

  ANIMATION_TIMEOUT = 600;

  ANIMATION_CURVE = 'easeOutQuint';

  EDGE_OFFSET = NODE_SIZE;

  randomColor = (function(_this) {
    return function() {
      var i;
      i = Math.round(Math.random() * ColorSchemes.length);
      if (i >= ColorSchemes.length) {
        i = ColorSchemes.length - 1;
      }
      if (i < 0) {
        i = 0;
      }
      return ColorSchemes[i]['background-color'];
    };
  })(this);

  KE = (function() {
    function KE() {
      this.sigma = null;
      this.nodes = {};
      this.edges = {};
      this.roots = [];
      this.grid = {};
      this.webletMap = {};
      sigma.classes.graph.addMethod('getNode', function(id) {
        var _ref;
        return (_ref = this.nodesIndex) != null ? _ref[id] : void 0;
      });
    }

    KE.prototype.close = function() {
      this.getLayer().makeInvisible();
      return $(ServiceDesk).trigger('ke.close');
    };

    KE.prototype.clear = function() {
      var _ref, _ref1, _ref2, _ref3;
      if ((_ref = this.sigma) != null) {
        if ((_ref1 = _ref.graph) != null) {
          _ref1.clear();
        }
      }
      return (_ref2 = this.sigma) != null ? (_ref3 = _ref2.graph) != null ? _ref3.kill() : void 0 : void 0;
    };

    KE.prototype.open = function() {
      if (this.sigma == null) {
        return this.render();
      } else {
        return this.getLayer().makeVisible();
      }
    };

    KE.prototype.getLayer = function() {
      var layer;
      layer = $('.ke-layer');
      if (!layer.exists()) {
        layer = $('<div id="__kelayer__" class="ke-layer" />');
        layer.addClass('invisible');
        $('body').append(layer);
      }
      return layer;
    };

    KE.prototype.getInfoLayer = function() {
      var layer, panel;
      layer = this.getLayer();
      panel = layer.find('.infopanel');
      if (!panel.exists()) {
        panel = $('<div />').addClass('infopanel');
        layer.append(panel);
      }
      return panel;
    };

    KE.prototype.getQILayer = function() {
      var layer, panel;
      layer = this.getLayer();
      panel = layer.find('.qipanel');
      if (!panel.exists()) {
        panel = $('<div />').addClass('qipanel');
        layer.append(panel);
      }
      return panel;
    };

    KE.prototype.getFactor = function(node, done) {
      var c, child_factors;
      if (done == null) {
        done = [];
      }
      if (__indexOf.call(done, node) >= 0) {
        return 0;
      }
      done.push(node);
      child_factors = (function() {
        var _i, _len, _ref, _results;
        _ref = node.children;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          c = _ref[_i];
          _results.push(this.getFactor(c, done));
        }
        return _results;
      }).call(this);
      if (child_factors.length === 0) {
        return 1;
      }
      return 1 + 1.5 * (_.max(child_factors));
    };

    KE.prototype.arrangeChildNodes = function(parent) {
      var c, factor, i, n, node, p, scale, _i, _len, _ref, _results;
      parent = this.sigma.graph.getNode(parent.id);
      if ((parent != null ? parent.children : void 0) == null) {
        return;
      }
      if (parent.children.length === 0) {
        return;
      }
      n = parent.children.length;
      if (n < 3 && n > 0) {
        n = 3;
      }
      p = this.sigma.graph.getNode(parent.id);
      _ref = parent.children;
      _results = [];
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        c = _ref[i];
        factor = this.getFactor(c);
        if (factor > 1) {
          factor = 1;
        }
        node = this.sigma.graph.getNode(c.id);
        scale = 10.0 * NODE_SIZE;
        node.x = 1 * parent.x + factor * scale * Math.cos(2 * i * Math.PI / n);
        _results.push(node.y = 1 * parent.y + factor * scale * Math.sin(2 * i * Math.PI / n));
      }
      return _results;
    };

    KE.prototype.arrange = function(root) {
      var c, _i, _len, _ref, _results;
      this.arrangeChildNodes(root);
      return;
      _ref = root.children;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        c = _ref[_i];
        _results.push(this.arrange(c));
      }
      return _results;
    };

    KE.prototype.arrangeAll = function() {
      var root, _i, _len, _ref;
      _ref = this.roots;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        root = _ref[_i];
        this.arrange(root);
      }
      return this.refresh();
    };

    KE.prototype.getNextPosition = function(parent) {
      var dir, new_x, new_y, nx, ny, stops, x, y, _i, _j, _k, _len, _ref, _ref1;
      if (parent == null) {
        x = 0;
        y = 0;
        while (this.grid[x + 'x' + y] != null) {
          y = y + GRID_SIZE * 1;
          if (this.grid[x + 'x' + y] == null) {
            break;
          }
          y = y * -1;
          if (this.grid[x + 'x' + y] == null) {
            break;
          }
          y = y * -1;
        }
        return {
          x: x,
          y: y
        };
      }
      _ref = [parent.x, parent.y], x = _ref[0], y = _ref[1];
      stops = DEF_SPACING;
      while (true) {
        _ref1 = [1, -1];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          dir = _ref1[_i];
          new_x = stops * dir;
          for (new_y = _j = -stops; -stops <= stops ? _j <= stops : _j >= stops; new_y = -stops <= stops ? ++_j : --_j) {
            nx = GRID_SIZE * new_x + parent.x;
            ny = GRID_SIZE * new_y + parent.y;
            if (this.grid[nx + 'x' + ny] == null) {
              return {
                x: nx,
                y: ny
              };
            }
          }
          new_y = stops * dir;
          for (new_x = _k = -stops; -stops <= stops ? _k <= stops : _k >= stops; new_x = -stops <= stops ? ++_k : --_k) {
            nx = GRID_SIZE * new_x + parent.x;
            ny = GRID_SIZE * new_y + parent.y;
            if (this.grid[nx + 'x' + ny] == null) {
              return {
                x: nx,
                y: ny
              };
            }
          }
        }
        stops += 1;
      }
    };

    KE.prototype.addObject = function(obj, parent) {
      var color, edge, eid, id, model_def, new_node, node, pos, x, y;
      if (parent == null) {
        parent = null;
      }
      x = y = 0;
      id = this.getIDForObject(obj);
      pos = this.getNextPosition(parent);
      new_node = false;
      if (this.nodes[id] == null) {
        new_node = true;
        model_def = parseModelUri(obj.ObjectType);
        color = randomColor();
        this.nodes[id] = {
          id: id,
          size: NODE_SIZE,
          type: 'image',
          url: '/Resources/' + model_def.app + '/AppIcon.svg',
          color: color,
          originalColor: color,
          x: pos.x,
          y: pos.y,
          obj: obj,
          children: []
        };
        this.grid[pos.x + 'x' + pos.y] = this.nodes[id];
      }
      node = this.nodes[id];
      if (this.sigma == null) {
        this.render();
      }
      if (new_node) {
        this.sigma.graph.addNode(node);
        this.roots.push(node);
      }
      if (parent != null) {
        eid = parent.id + '|' + node.id;
        if (this.edges[eid] == null) {
          edge = {
            id: eid,
            source: parent.id,
            target: node.id,
            size: 2,
            color: parent.color,
            originalColor: node.originalColor,
            type: 'ke'
          };
          this.edges[eid] = edge;
          this.sigma.graph.addEdge(edge);
        }
        if (__indexOf.call(parent.children, node) < 0) {
          parent.children.push(node);
        }
      }
      return node;
    };

    KE.prototype.loadKEWebletConfig = function(ot, objects) {
      return this.webletMap[ot] = objects;
    };

    KE.prototype.expandNode = function(node, after) {
      var connection, ok, ot, parentOt, weblet_config_ot, weblet_config_required, _ref;
      ot = node.obj.ObjectType;
      ok = node.obj.ObjectKey;
      if (node.obj.HasMany === 'true') {
        connection = (_ref = node.obj.Connection) != null ? _ref : '';
      }
      weblet_config_required = 1;
      weblet_config_ot = ot;
      if (xstr(node.obj.Relationship) !== '') {
        weblet_config_ot = ot + ':' + xstr(node.obj.Relationship);
      }
      if (this.webletMap[weblet_config_ot] != null) {
        weblet_config_required = 0;
      }
      parentOt = '';
      if (xstr(node.obj.Parent) !== '') {
        parentOt = xstr(node.obj.Parent);
      }
      ServiceDesk.executeService('System', 'KERelationships', {
        ObjectType: ot,
        ParentObjectType: parentOt,
        Relationship: xstr(node.obj.Relationship),
        ObjectKey: ok,
        Connection: connection,
        WebletConfig: weblet_config_required
      }, (function(_this) {
        return function(data) {
          var obj, objects, relationship, _i, _len;
          for (relationship in data) {
            objects = data[relationship];
            if (relationship === '__keweblets__') {
              _this.loadKEWebletConfig(ot, objects);
              continue;
            }
            for (_i = 0, _len = objects.length; _i < _len; _i++) {
              obj = objects[_i];
              if (obj.HasMany === 'true') {
                obj.ObjectID = node.obj.ObjectID;
                obj.ObjectType = node.obj.ObjectType;
                obj.ObjectKey = node.obj.ObjectKey;
                obj.Label = obj.Relationship;
                _this.addObject(obj, node);
                continue;
              }
              if (!obj.ObjectKey) {
                continue;
              }
              if (!obj.ObjectType) {
                continue;
              }
              if (!obj.ObjectID) {
                continue;
              }
              _this.addObject(obj, node);
            }
          }
          _this.highlightNodes(node);
          return typeof after === "function" ? after() : void 0;
        };
      })(this));
      return (function(_this) {
        return function(err) {
          return alert(err);
        };
      })(this);
    };

    KE.prototype.loadWeblets = function(node) {
      var obj, ot, panel, _i, _len, _ref, _results;
      ot = node.obj.ObjectType;
      if (this.webletMap[ot] == null) {
        return;
      }
      panel = this.getInfoLayer();
      panel.makeInvisible();
      if (this.wc == null) {
        this.wc = new WebletContainer(panel, false);
        this.wc.defaultRowCount = 1;
      }
      this.wc.removeAllWeblets();
      _ref = this.webletMap[ot];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        obj = _ref[_i];
        _results.push((function(_this) {
          return function(obj) {
            var app, params, view, weblet_params;
            panel.makeVisible();
            app = obj.AppName;
            view = obj.ViewName;
            params = {
              key: node.obj.ObjectKey
            };
            weblet_params = _.clone(params);
            return _this.wc.loadWeblet(app, view, params, 'colorscheme' + (1 + Math.round(Math.random() * 11)), function(content) {
              return $(ServiceDesk).trigger('mde.webletadded', [node, app, view, weblet_params, content]);
            }, weblet_params);
          };
        })(this)(obj));
      }
      return _results;
    };

    KE.prototype.loadQI = function(node) {
      var panel, u;
      panel = this.getQILayer();
      panel.animate({
        left: -panel.width()
      }, ANIMATION_TIMEOUT, ANIMATION_CURVE);
      panel.css({
        left: -panel.width()
      });
      u = ServiceDesk.getQIUri(node.obj.ObjectType);
      return ServiceDesk.loadView(u.app, u.view, {
        'key': node.obj.ObjectKey
      }, function(html) {
        panel.empty();
        panel.append($(html));
        panel.makeVisible();
        return panel.animate({
          left: 0
        }, ANIMATION_TIMEOUT, ANIMATION_CURVE);
      }, function(err) {
        return panel.makeInvisible();
      });
    };

    KE.prototype.clicked = function(node) {
      this.expandNode(node, (function(_this) {
        return function() {
          return _this.loadWeblets(node);
        };
      })(this));
      this.loadQI(node);
      return $(ServiceDesk).trigger('ke.expand', [node]);
    };

    KE.prototype.getIDForObject = function(obj) {
      var id;
      id = '';
      if (obj.Relationship != null) {
        id = obj.Relationship + ':';
      }
      id += obj.ObjectType + ':' + obj.ObjectKey;
      return id;
    };

    KE.prototype.focusObject = function(obj) {
      var node, _ref;
      node = (_ref = this.sigma) != null ? _ref.graph.getNode(this.getIDForObject(obj)) : void 0;
      if (node != null) {
        return this.highlightNodes(node);
      }
    };

    KE.prototype.highlightNodes = function(node) {
      var e, panner, relevant_nodes, _i, _j, _len, _len1, _ref, _ref1;
      relevant_nodes = {};
      relevant_nodes[node.id] = true;
      _ref = this.sigma.graph.edges();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        e = _ref[_i];
        if (e.source === node.id || e.target === node.id) {
          relevant_nodes[e.target] = true;
          relevant_nodes[e.source] = true;
          e.alpha = 1;
        } else {
          e.alpha = EDGE_ALPHA;
        }
      }
      _ref1 = this.sigma.graph.nodes();
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        e = _ref1[_j];
        if (relevant_nodes[e.id] != null) {
          e.type = 'image';
          e.alpha = 1.0;
          e.color = e.originalColor;
        } else {
          e.type = 'image';
          e.alpha = NODE_ALPHA;
          e.color = '#333';
        }
      }
      this.refresh();
      panner = (function(_this) {
        return function() {
          var cn;
          cn = _this.sigma.graph.getNode(node.id);
          return sigma.misc.animation.camera(_this.sigma.camera, {
            x: cn['read_cam0:x'],
            y: cn['read_cam0:y'],
            ratio: _this.sigma.camera.ratio
          }, {
            duration: 400
          });
        };
      })(this);
      return panner();
    };

    KE.prototype.refresh = function() {
      var _ref;
      return (_ref = this.sigma) != null ? _ref.refresh() : void 0;
    };

    KE.prototype.renderUIComponents = function() {
      var closer, layer;
      layer = this.getLayer();
      closer = $('<span />').addClass('closer v3icon-error-close');
      layer.append(closer);
      return closer.touchClick((function(_this) {
        return function(evnt) {
          evnt.preventDefault();
          return _this.close();
        };
      })(this));
    };

    KE.prototype.render = function() {
      var layer;
      layer = this.getLayer();
      layer.makeVisible();
      layer.empty();
      if (this.sigma == null) {
        this.sigma = new sigma({
          renderer: {
            type: 'canvas',
            container: $$('__kelayer__').get(0)
          },
          settings: {
            autoRescale: false,
            nodesPowRatio: 1,
            edgesPowRatio: 1
          }
        });
        this.sigma.bind('clickNode', (function(_this) {
          return function(e) {
            return _this.clicked(e.data.node);
          };
        })(this));
      }
      return this.renderUIComponents();
    };

    KE.prototype.animate = function(after) {
      var stop, _ref;
      if ((_ref = this.sigma) != null) {
        _ref.startForceAtlas2();
      }
      stop = (function(_this) {
        return function() {
          var _ref1;
          if ((_ref1 = _this.sigma) != null) {
            _ref1.stopForceAtlas2();
          }
          return typeof after === "function" ? after() : void 0;
        };
      })(this);
      return setTimeout(stop, 1000);
    };

    KE.prototype.test = function() {
      var c, c2, j, k, obj, obj2, parent, root, _i, _results;
      root = {
        ObjectType: 'Location',
        ObjectKey: 1,
        ObjectID: 'Root Location'
      };
      parent = this.addObject(root);
      this.refresh();
      return;
      _results = [];
      for (k = _i = 0; _i <= 10; k = ++_i) {
        obj = {
          ObjectType: 'Asset',
          ObjectKey: k,
          ObjectID: ' Asset ' + k
        };
        c = this.addObject(obj, parent);
        _results.push((function() {
          var _j, _results1;
          _results1 = [];
          for (j = _j = 0; _j <= 5; j = ++_j) {
            obj2 = {
              ObjectType: 'LAC' + k,
              ObjectKey: j,
              ObjectID: ' Asset ' + k + ' ' + j
            };
            _results1.push(c2 = this.addObject(obj2, c));
          }
          return _results1;
        }).call(this));
      }
      return _results;
    };

    return KE;

  })();

  sigma.canvas.edges.ke = function(edge, source, target, context, settings) {
    var color, cx, cy, edge_dot_radius, len, prefix, ratio, sx, sy, tx, ty, x_offset, xdir, y_offset, ydir;
    color = edge.color;
    prefix = settings('prefix') || '';
    context.save();
    context.globalAlpha = edge.alpha || 1.0;
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = edge[prefix + 'size'] || 1;
    context.lineWidth = edge.size;
    context.beginPath();
    sx = source[prefix + 'x'];
    sy = source[prefix + 'y'];
    tx = target[prefix + 'x'];
    ty = target[prefix + 'y'];
    len = Math.pow(tx - sx, 2) + Math.pow(ty - sy, 2);
    if (len === 0) {
      console.log('Warning: unable to draw edge because of zero-div');
      return;
    }
    ratio = 1 - EDGE_OFFSET / Math.sqrt(len);
    xdir = ydir = 1;
    if (sx > tx) {
      xdir = -1;
    }
    if (sy > ty) {
      ydir = -1;
    }
    x_offset = Math.abs(tx - sx) * ratio;
    y_offset = Math.abs(ty - sy) * ratio;
    sx += xdir * x_offset;
    tx += -1 * xdir * x_offset;
    sy += ydir * y_offset;
    ty += -1 * ydir * y_offset;
    context.moveTo(sx, sy);
    if (sy === ty) {
      cx = sx + 0.5 * (tx - sx);
      cy = sy + 0.1 * (tx - sx);
      context.quadraticCurveTo(cx, cy, tx, ty);
    } else if (sx === tx) {
      cy = sy + 0.5 * (ty - sy);
      cx = sx + 0.1 * (ty - sy);
      context.quadraticCurveTo(cx, cy, tx, ty);
    } else {
      context.lineTo(tx, ty);
    }
    context.stroke();
    edge_dot_radius = 3;
    context.beginPath();
    context.arc(sx, sy, edge_dot_radius, 0, 2 * Math.PI);
    context.fill();
    context.beginPath();
    context.arc(tx, ty, edge_dot_radius, 0, 2 * Math.PI);
    context.fill();
    return context.restore();
  };

  ImageCache = {};

  loadImage = function(url, cb) {
    var img;
    if (ImageCache[url] == null) {
      img = new Image();
      img.src = url;
      img.width = img.height = '25';
      img.onload = function() {
        ImageCache[url] = img;
        return typeof cb === "function" ? cb(img) : void 0;
      };
      return null;
    } else {
      img = ImageCache[url];
      if (typeof cb === "function") {
        cb(img);
      }
      return img;
    }

    /*
    sigma.canvas.nodes.image = do () ->
    renderer = (node,context,settings) ->
        img = loadImage node.url
        if not img? then return
        context.save()
        context.beginPath()
        context.arc node.x,node.y,node.size,0,Math.PI*2,true
        context.lineWidth = 1;
        context.strokeStyle = node.color
        context.stroke()
        context.drawImage img,node.x - node.size,node.y-node.size,node.size,node.size
        context.restore()
    
    return renderer
     */
  };

  wrapText = function(context, text, x, y, maxWidth, lineHeight) {
    var cars, fillTxt, ii, line, metrics, mh, mw, n, original_x, original_y, test_line, test_width, text_instructions, ti, w, word, words, _i, _j, _k, _len, _len1, _len2, _results;
    original_y = y;
    original_x = x;
    mw = maxWidth;
    cars = text.split('\n');
    text_instructions = [];
    fillTxt = function(line, x, y) {
      return text_instructions.push([line, x, y]);
    };
    for (ii = _i = 0, _len = cars.length; _i < _len; ii = ++_i) {
      w = cars[ii];
      line = '';
      words = w.split(' ');
      for (n = _j = 0, _len1 = words.length; _j < _len1; n = ++_j) {
        word = words[n];
        test_line = line + word + ' ';
        metrics = context.measureText(test_line);
        test_width = metrics.width;
        if (test_width > maxWidth) {
          fillTxt(line, x, y);
          line = word + ' ';
          y += lineHeight;
          if (test_width > mw) {
            mw = test_width;
          }
        } else {
          line = test_line;
        }
      }
      fillTxt(line, x, y);
      y += lineHeight;
    }
    mh = y - original_y - lineHeight + 4;
    context.save();
    context.fillStyle = 'rgba(10,10,10,0.7)';
    if (false) {
      context.shadowColor = 'rgba(100,100,100,0.5)';
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
      context.shadowBlur = 10;
    }
    context.beginPath();
    context.rect(original_x, original_y, mw, mh);
    context.fill();
    context.restore();
    _results = [];
    for (_k = 0, _len2 = text_instructions.length; _k < _len2; _k++) {
      ti = text_instructions[_k];
      _results.push(context.fillText(ti[0], ti[1], ti[2]));
    }
    return _results;
  };

  
function _wrapText(context, text, x, y, maxWidth, lineHeight) {
    var cars = text.split("\n");

    for (var ii = 0; ii < cars.length; ii++) {

        var line = "";
        var words = cars[ii].split(" ");

        for (var n = 0; n < words.length; n++) {
            var testLine = line + words[n] + " ";
            var metrics = context.measureText(testLine);
            var testWidth = metrics.width;

            if (testWidth > maxWidth) {
                context.fillText(line, x, y);
                line = words[n] + " ";
                y += lineHeight;
            }
            else {
                line = testLine;
            }
        }

        context.fillText(line, x, y);
        y += lineHeight;
    }
 }

sigma.canvas.nodes.image = (function () {
        var _cache = {};

        var renderer = function (node, context, settings) {
            var args = arguments,
                prefix = settings('prefix') || '',
                x = node[prefix + 'x'],
                y = node[prefix + 'y'],
                size = node[prefix + 'size'];

            var displayImages = settings('displayImages');
            displayImages = true;
            if (displayImages == true) {
                if (!_cache[node.id]) {
                    /*
                    var img = new Image();
                    img.src = node.url;
                    $(img).attr("onError", "imageError(this)");
                    _cache[node.id] = function(){return img;}
                    */
                    canvg2(node.url,function(f){
                        _cache[node.id] = f;
                    });
                }

                context.save();

                // Draw the clipping disc:
                /*
                context.beginPath();
                context.arc(x, y, size, 0, Math.PI * 2, true);
                context.closePath();
                context.clip();
                */

                // Draw the image
                size = 20;
                var alpha = node.alpha || 1.0;
                context.globalAlpha = alpha;

                context.save();
                context.translate(x-size,y-size);
                context.scale(2*size/SVG_SIZE,2*size/SVG_SIZE);
                context.fillStyle = node.color;
                _cache[node.id](context);
                context.restore();

                /*context.drawImage(_cache[node.id], x - size, y - size, 2 * size, 2 * size);*/
                var txt = node.obj.ObjectID;
                if (!!node.obj.Relationship) 
                    //txt = node.obj.Relationship;
                    txt = node.obj.Relationship + ': ' + txt
                if (!!node.obj.Label)
                    txt = node.obj.Label;

                var fontSize = 14;
                context.font = fontSize + 'px "Helvetica"';
                context.fillStyle = '#eee';
                if (alpha > 0.5) {

                wrapText(context
                    ,txt
                    ,Math.round(x- NODE_SIZE)
                    ,Math.round(y+size+fontSize)
                    ,NODE_SIZE*2
                    ,fontSize
                    );
/*
                context.fillText(txt
                    ,Math.round(x - NODE_SIZE)
                    ,Math.round(y+size +fontSize)
                    );
*/
                }
                // Quit the "clipping mode":
                context.restore();

                // Draw the border:
                /*
                context.beginPath();
                context.arc(x, y, size, 0, Math.PI * 2, true);
                context.lineWidth = size / 20;
                context.strokeStyle = node.color || settings('defaultNodeColor');
                context.stroke();
                */
            }
            else {
                sigma.canvas.nodes.def.apply(
                    sigma.canvas.nodes,
                    args
                );

                // Draw a black border
                context.beginPath();
                context.arc(
                    x,
                    y,
                    size,
                    0,
                    Math.PI * 2,
                    true
                );
                context.lineWidth = size / 20;
                context.strokeStyle = 'rgb(0,0,0)';
                context.stroke();
            }
        };

        return renderer;
    })();
    ;

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.KE = KE;

}).call(this);
