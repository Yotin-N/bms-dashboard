(function() {
  var NumberFormatter, root;
  var __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  NumberFormatter = (function() {
    NumberFormatter.prototype.version = "0.1";
    function NumberFormatter(opts) {
      this.opts = opts;
      this.rx_strip_comma = new RegExp(this.opts.comma, "g");
      this.rx_form_dec = new RegExp(this.opts.decimal, "g");
    }
    NumberFormatter.prototype.formatNumber = function(ns) {
      var buffer, cents, cg, ch, comma, current_group_count, decimal, dollars, gc, groups, i, negative, nextGroup, parts, x, xnum, _ref, _ref2, _ref3;
      xnum = +ns;
      if (!(xnum != null) || isNaN(xnum)) {
        return "";
      }
      if (__indexOf.call("" + xnum, 'e') >= 0) {
        return ns;
      }
      negative = xnum < 0;
      x = "" + Math.abs(xnum);
      parts = x.split('.');
      switch (parts.length) {
        case 1:
          parts.push('');
          break;
        case 2:
          break;
        default:
          return ns;
      }
      if (parts.length !== 2) {
        return x;
      }
      dollars = parts[0], cents = parts[1];
      if (cents.length < this.opts.currencyDecimals) {
        for (i = _ref = cents.length, _ref2 = this.opts.currencyDecimals - 1; _ref <= _ref2 ? i <= _ref2 : i >= _ref2; _ref <= _ref2 ? i++ : i--) {
          cents += '0';
        }
      }
      groups = this.opts.digitGroups;
      comma = this.opts.comma;
      decimal = this.opts.decimal;
            if (groups != null) {
        groups;
      } else {
        groups = [3];
      };
      cg = 0;
      nextGroup = function() {
        var g;
        g = groups[cg];
        if (cg < groups.length - 1) {
          cg++;
        }
        return g;
      };
      buffer = [];
      current_group_count = nextGroup();
      gc = 0;
      for (i = _ref3 = dollars.length - 1; _ref3 <= 0 ? i <= 0 : i >= 0; _ref3 <= 0 ? i++ : i--) {
        ch = dollars[i];
        buffer.push(ch);
        gc++;
        if (gc === current_group_count && i > 0) {
          buffer.push(comma);
          gc = 0;
          current_group_count = nextGroup();
        }
      }
      buffer.reverse();
      return (negative ? '-' : '') + buffer.join('') + (cents.length > 0 ? decimal + cents : '');
    };
    NumberFormatter.prototype.formatCurrency = function(cy) {
      var p;
      p = this.opts.currencyDecimals || 2;
      return this.formatNumber((+cy).toFixed(p));
    };
    NumberFormatter.prototype.parseNumber = function(txt) {
      var ch, new_txt, _i, _len;
      new_txt = '';
      for (_i = 0, _len = txt.length; _i < _len; _i++) {
        ch = txt[_i];
        if (ch === this.opts.comma) {
          continue;
        }
        if (ch === this.opts.decimal) {
          ch = '.';
        }
        new_txt += ch;
      }
      return xnum(new_txt);
    };
    return NumberFormatter;
  })();
  root = typeof exports !== "undefined" && exports !== null ? exports : this;
  root.NumberFormatter = NumberFormatter;
}).call(this);
