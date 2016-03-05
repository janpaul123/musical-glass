// # clayer
// **clayer** is a lightweight library for highly interactive websites.
// It provides an abstraction for mouse and (multi-)touch events, and high-level widgets.
// Clayer is based on the internal library of <worrydream.com>, Bret Victor's website, called *BVLayer* or *LayerScript*.
// You can pick and choose what you like from this library and adapt it to your own needs.
// We believe it is more useful to have a simple, readable library that you can fully understand and modify, than having a large and configurable library.

/*jshint jquery:true */
(function () {
  "use strict";

  // ## Helper functions

  // Clayer uses the `clayer` global object.
  var clayer = {};
  window.clayer = clayer;

  // Modify `clayer.texts` to internationalize strings.
  clayer.texts = {
    drag: 'drag'
  };

  // `clayer.makeCall()` is used for only calling callbacks if they exist.
  clayer.makeCall = function(obj, func, args) {
    if (obj[func]) {
      return obj[func].apply(obj, args);
    }
  };

  // `clayer.setCss3()` can be used to apply proprietary CSS extensions.
  // The prefixes of the major browsers are added before the name of the attribute.
  // If `addBrowserToValue` is true, it is also added before the value, which is useful for some attributes such as transitions.
  clayer.setCss3 = function($element, name, value, addBrowserToValue) {
    addBrowserToValue = addBrowserToValue || false;
    var browsers = ['', '-ms-', '-moz-', '-webkit-', '-o-'];
    for (var i=0; i<browsers.length; i++) {
      var cssName = browsers[i] + name;
      var cssValue = (addBrowserToValue ? browsers[i] : '') + value;
      $element.css(cssName, cssValue);
    }
  };

  // `clayer.isTouch` is true or false depending on whether the browser supports touch events.
  clayer.isTouch = ('ontouchstart' in document.documentElement);

  // When `clayer.initBody()` is called, the body element is given a `clayer-body-touch` or `clayer-body-mouse` class, depending on `clayer.isTouch`.
  clayer.initBody = function() {
    if (clayer.isTouch) {
      $('body').addClass('clayer-body-touch');
    } else {
      $('body').addClass('clayer-body-mouse');
    }
  };

  // ## Touchable
  // `clayer.Touchable` provides an abstraction over touch and mouse events.
  // We make a distinction between hover and touch/click events. First we look at the latter.
  //
  clayer.Touchable = function() { return this.init.apply(this, arguments); };
  clayer.Touchable.prototype = {
    init: function($element, callbacks) {
      this.$element = $element;
      this.$document = $($element[0].ownerDocument);
      this.callbacks = callbacks;

      this.mouseDown = $.proxy(this.mouseDown, this);
      this.mouseMove = $.proxy(this.mouseMove, this);
      this.mouseUp = $.proxy(this.mouseUp, this);
      this.touchStart = $.proxy(this.touchStart, this);
      this.touchMove = $.proxy(this.touchMove, this);
      this.touchEnd = $.proxy(this.touchEnd, this);
      this.hoverMove = $.proxy(this.hoverMove, this);
      this.hoverLeave = $.proxy(this.hoverLeave, this);

      this.documentEvents = {
        mousemove: this.mouseMove,
        mouseup: this.mouseUp,
        touchmove: this.touchMove,
        touchend: this.touchEnd,
        touchcancel: this.touchEnd
      };

      this.setTouchable(false);
      this.setHoverable(false);
    },

    remove: function() {
      this.setTouchable(false);
      this.setHoverable(false);
    },

    setTouchable: function(isTouchable) {
      if (this.isTouchable === isTouchable) return;
      this.isTouchable = isTouchable;
      this.touchEvent = null;

      if (isTouchable) {
        this.$element.on({
          mousedown: this.mouseDown,
          touchstart: this.touchStart
        });
      }
      else {
        this.$element.off('mousedown touchstart');
        this.$document.off(this.documentEvents);
        // CSS3 "pointer-events: none" here? (not supported by IE)
      }
    },

    setHoverable: function(isHoverable) {
      if (this.isHoverable === isHoverable) return;
      this.isHoverable = isHoverable;
      this.hoverEvent = null;

      if (isHoverable) {
        this.$element.on({
          mousemove: this.hoverMove,
          mouseleave: this.hoverLeave
        });
      }
      else {
        this.$element.off({
          mousemove: this.hoverMove,
          mouseleave: this.hoverLeave
        });
        // CSS3 "pointer-events: none" here? (not supported by IE)
      }
    },

    mouseDown: function(event) {
      if (this.isTouchable) {
        this.$document.on({
          mousemove: this.mouseMove,
          mouseup: this.mouseUp
        });

        this.touchEvent = new clayer.PositionEvent(this.$element, event, event.timeStamp, true);
        clayer.makeCall(this.callbacks, 'touchDown', [this.touchEvent]);
      }
      return false;
    },

    mouseMove: function(event) {
      if (this.isTouchable && this.touchEvent) {
        this.touchEvent.move(event, event.timeStamp);
        clayer.makeCall(this.callbacks, 'touchMove', [this.touchEvent]);
      }
      return false;
    },

    mouseUp: function(event) {
      if (this.isTouchable && this.touchEvent) {
        this.touchEvent.up(event, event.timeStamp);
        clayer.makeCall(this.callbacks, 'touchUp', [this.touchEvent]);
        this.touchEvent = null;
      }
      this.$document.off(this.documentEvents);
      return false;
    },

    touchStart: function(event) {
      this.$element.off({
        'mousedown': this.mouseDown,
        'mousemove': this.hoverMove,
        'mouseleave': this.hoverLeave
      }); // we're on a touch device (safer than checking using clayer.isTouch)

      if (!this.isTouchable || this.touchEvent || event.originalEvent.targetTouches.length > 1) {
        this.touchEnd(event);
      } else {
        this.$document.on({
          touchmove: this.touchMove,
          touchend: this.touchEnd,
          touchcancel: this.touchEnd
        });

        this.touchEvent = new clayer.PositionEvent(this.$element, event.originalEvent.targetTouches[0], event.timeStamp, false);
        clayer.makeCall(this.callbacks, 'touchDown', [this.touchEvent]);
      }
      return false;
    },

    touchMove: function(event) {
      if (this.isTouchable && this.touchEvent) {
        var touchEvent = this.findTouchEvent(event.originalEvent.touches);
        if (touchEvent === null) {
          this.touchEnd(event);
        } else {
          this.touchEvent.move(touchEvent, event.timeStamp);
          clayer.makeCall(this.callbacks, 'touchMove', [this.touchEvent]);
        }
      }
      return false;
    },

    touchEnd: function(event) {
      if (this.isTouchable && this.touchEvent) {
        this.touchEvent.up(this.findTouchEvent(event.originalEvent.touches), event.timeStamp);
        clayer.makeCall(this.callbacks, 'touchUp', [this.touchEvent]);
        this.touchEvent = null;
      }
      this.$document.off(this.documentEvents);
      return false;
    },

    hoverMove: function(event) {
      if (this.touchEvent) {
        this.mouseMove(event);
      } else if (this.isHoverable) {
        if (!this.hoverEvent) {
          this.hoverEvent = new clayer.PositionEvent(this.$element, event, true);
        } else {
          this.hoverEvent.move(event, event.timeStamp);
        }
        clayer.makeCall(this.callbacks, 'hoverMove', [this.hoverEvent]);
      }
      return false;
    },

    hoverLeave: function(event) {
      if (this.isHoverable && this.hoverEvent) {
        this.hoverEvent.move(event);
        clayer.makeCall(this.callbacks, 'hoverLeave', [this.hoverEvent]);
        this.hoverEvent = null;
      }
      return false;
    },

    findTouchEvent: function(touches) {
      for (var i=0; i<touches.length; i++) {
        if (touches[i].identifier === this.touchEvent.event.identifier) {
          return touches[i];
        }
      }
      return null;
    }
  };

  clayer.PositionEvent = function() { return this.init.apply(this, arguments); };
  clayer.PositionEvent.prototype = {
    init: function($element, event, timestamp, mouse) {
      this.$element = $element;
      this.globalPoint = { x: event.pageX, y: event.pageY };
      this.translation = { x: 0, y: 0 };
      this.deltaTranslation = { x: 0, y: 0 };
      this.localPoint = { x: 0, y: 0 };
      this.updateLocalPoint();

      this.event = event;
      this.startTimestamp = this.timestamp = timestamp;
      this.hasMoved = false;
      this.wasTap = false;
      this.mouse = mouse;
    },

    getTimeSinceGoingDown: function () {
      return this.timestamp - this.startTimestamp;
    },

    resetDeltaTranslation: function() {
      this.deltaTranslation.x = 0;
      this.deltaTranslation.y = 0;
    },

    inElement: function() {
      return this.localPoint.x >= 0 && this.localPoint.x <= this.$element.outerWidth() &&
        this.localPoint.y >= 0 && this.localPoint.y <= this.$element.outerHeight();
    },

    move: function(event, timestamp) {
      this.event = event;
      this.timestamp = timestamp;
      this.updatePositions();
    },

    up: function(event, timestamp) {
      this.event = event || this.event;
      this.timestamp = timestamp;
      this.wasTap = !this.hasMoved && (this.getTimeSinceGoingDown() < 300);
    },

    updatePositions: function() {
      var dx = this.event.pageX - this.globalPoint.x;
      var dy = this.event.pageY - this.globalPoint.y;
      this.translation.x += dx;
      this.translation.y += dy;
      this.deltaTranslation.x += dx;
      this.deltaTranslation.y += dy;
      this.globalPoint.x = this.event.pageX;
      this.globalPoint.y = this.event.pageY;
      this.updateLocalPoint();

      if (this.translation.x*this.translation.x + this.translation.y*this.translation.y > 200) this.hasMoved = true;
    },

    updateLocalPoint: function() {
      var offset = this.$element.offset();
      this.localPoint.x = this.globalPoint.x - offset.left;
      this.localPoint.y = this.globalPoint.y - offset.top;
    }
  };

  clayer.Scrubbable = function() { return this.init.apply(this, arguments); };
  clayer.Scrubbable.prototype = {
    init: function($element, callbacks, options) {
      this.$element = $element;
      this.callbacks = callbacks;
      this.options = options || {};
      this.touchable = new clayer.Touchable($element, this);
      this.setScrubbable(true);
    },

    remove: function() {
      this.touchable.remove();
    },

    setScrubbable: function(value) {
      this.touchable.setTouchable(value);

      if (this.options.disableHover) {
        this.touchable.setHoverable(false);
      } else {
        this.touchable.setHoverable(value);
      }
    },

    hoverMove: function(event) {
      clayer.makeCall(this.callbacks, 'scrubMove', [event.localPoint.x, event.localPoint.y, false]);
    },

    hoverLeave: function(event) {
      clayer.makeCall(this.callbacks, 'scrubLeave', []);
    },

    touchDown: function(event) {
      this.touchMove(event);
    },

    touchMove: function(event) {
      clayer.makeCall(this.callbacks, 'scrubMove', [event.localPoint.x, event.localPoint.y, true]);
    },

    touchUp: function(event) {
      if (!event.mouse || !event.inElement()) {
        clayer.makeCall(this.callbacks, 'scrubLeave', []);
      } else {
        this.hoverMove(event);
      }
      if (event.wasTap) {
        clayer.makeCall(this.callbacks, 'scrubTap', [event.localPoint.x, event.localPoint.y]);
      }
    }
  };

  clayer.Slider = function() { return this.init.apply(this, arguments); };
  clayer.Slider.prototype = {
    init: function($element, callbacks, valueWidth, options) {
      this.$element = $element;
      this.$element.addClass('clayer-slider');
      this.callbacks = callbacks;

      this.valueWidth = valueWidth || 1;
      this.markerValue = 0;
      this.knobValue = 0;

      this.$container = $('<div class="clayer-slider-container"></div>');
      this.$element.append(this.$container);

      this.$bar = $('<div class="clayer-slider-bar"></div>');
      this.$container.append(this.$bar);

      this.$segmentContainer = $('<div class="clayer-slider-segment-container"></div>');
      this.$bar.append(this.$segmentContainer);

      this.$marker = $('<div class="clayer-slider-marker"></div>');
      this.markerWidth = Math.min(this.valueWidth, 10);
      this.$marker.width(this.markerWidth);
      this.$bar.append(this.$marker);

      this.$knob = $('<div class="clayer-slider-knob"></div>');
      this.$container.append(this.$knob);

      this.scrubbable = new clayer.Scrubbable(this.$element, this, options);

      this.bounceTimer = null;

      this.renderKnob();
      this.renderMarker();
    },

    remove: function() {
      this.scrubbable.remove();
      this.$segmentContainer.remove();
      this.$marker.remove();
      this.$knob.remove();
      this.$bar.remove();
      this.$container.remove();
    },

    setSegments: function(ranges) {
      this.$segmentContainer.html('');
      for (var i=0; i<ranges.length; i++) {
        var range = ranges[i];
        var $segment = $('<div class="clayer-slider-segment"></div>');
        this.$segmentContainer.append($segment);

        $segment.css('left', range.start*this.valueWidth);
        $segment.width((range.end - range.start + 1)*this.valueWidth);
        $segment.css('background-color', range.color);
      }
    },

    setValue: function(value) {
      this.markerValue = this.knobValue = value;
      this.renderKnob();
      this.renderMarker();
    },

    setKnobValue: function(value) {
      this.knobValue = value;
      this.renderKnob();
    },

    changed: function(down) {
      clayer.makeCall(this.callbacks, 'sliderChanged', [this.knobValue, down]);
    },

    updateKnob: function(x) {
      x = Math.max(0, Math.min(this.$element.width()-1, x));
      this.updateKnobValue(Math.floor(x/this.valueWidth));
    },

    updateKnobValue: function(knobValue) {
      if (this.knobValue !== knobValue) {
        this.knobValue = knobValue;
        this.renderKnob();
        this.changed(false);
      }
    },

    updateMarker: function(x) {
      x = Math.max(0, Math.min(this.$element.width()-1, x));
      var markerValue = Math.floor(x/this.valueWidth);
      if (this.markerValue !== markerValue) {
        this.knobValue = this.markerValue = markerValue;
        this.renderKnob();
        this.renderMarker();
        this.changed(true);
      }
    },

    renderKnob: function() {
      this.$knob.css('left', (this.knobValue+0.5)*this.valueWidth);
    },

    renderMarker: function() {
      this.$marker.css('left', (this.markerValue+0.5)*this.valueWidth - this.markerWidth/2);
    },

    scrubMove: function(x, y, down) {
      this.$knob.addClass('clayer-active');
      if (down) {
        this.$knob.addClass('clayer-pressed');
        this.updateMarker(x);
      } else {
        this.$knob.removeClass('clayer-pressed');
        this.updateKnob(x);
      }
    },

    scrubLeave: function() {
      this.$knob.removeClass('clayer-active clayer-pressed');
      this.updateKnobValue(this.markerValue);
      clayer.makeCall(this.callbacks, 'sliderLeave');
    },

    scrubTap: function() {
      this.$knob.removeClass('clayer-slider-knob-jump');
      setTimeout($.proxy(this.startJump, this), 0);
    },

    startJump: function() {
      this.$knob.addClass('clayer-slider-knob-jump');
    }
  };

  clayer.Draggable = function() { return this.init.apply(this, arguments); };
  clayer.Draggable.prototype = {
    init: function($element, callbacks, $parent) {
      this.$element = $element;
      this.callbacks = callbacks;
      this.$parent = $parent;
      this.touchable = new clayer.Touchable($element, this);
      this.setDraggable(true);
    },

    remove: function() {
      this.touchable.remove();
    },

    setDraggable: function(value) {
      this.touchable.setTouchable(value);
      this.touchable.setHoverable(false);
    },

    touchDown: function(event) {
      this.offsetX = event.localPoint.x + parseInt(this.$element.css('margin-left'), 10);
      this.offsetY = event.localPoint.y + parseInt(this.$element.css('margin-top'), 10);
      clayer.makeCall(this.callbacks, 'dragStart', [this.offsetX, this.offsetY]);
    },

    touchMove: function(event) {
      var x = event.globalPoint.x-this.offsetX, y = event.globalPoint.y-this.offsetY;

      if (this.$parent !== undefined) {
        var parentOffset = this.$parent.offset();
        x = Math.max(0, Math.min(this.$parent.outerWidth(), x-parentOffset.left));
        y = Math.max(0, Math.min(this.$parent.outerHeight(), y-parentOffset.top));
        this.$element.css('left', x);
        this.$element.css('top', y);
        clayer.makeCall(this.callbacks, 'dragMove', [x, y, event.globalPoint.x, event.globalPoint.y]);
      } else {
        clayer.makeCall(this.callbacks, 'dragMove', [x, y, event.globalPoint.x, event.globalPoint.y]);
      }
    },

    touchUp: function(event) {
      clayer.makeCall(this.callbacks, 'dragEnd');
      if (event.wasTap) {
        clayer.makeCall(this.callbacks, 'dragTap', [event.localPoint.x, event.localPoint.y]);
      }
    }
  };

  clayer.DragKnob = function() { return this.init.apply(this, arguments); };
  clayer.DragKnob.prototype = {
    init: function($element, callbacks, $parent) {
      this.$element = $element;
      this.$element.addClass('clayer-dragknob');
      this.$element.append('<div class="clayer-dragknob-label">' + clayer.texts.drag + '</div>');

      this.$parent = $parent;
      if (this.$parent !== undefined) {
        this.$parent.addClass('clayer-dragknob-parent');
      }

      this.callbacks = callbacks;
      this.draggable = new clayer.Draggable($element, this, $parent);
    },

    remove: function() {
      this.draggable.remove();
      this.$element.removeClass('clayer-dragknob');
      if (this.$parent !== undefined) {
        this.$parent.addClass('clayer-dragknob-parent');
      }
    },

    dragStart: function() {
      this.$element.addClass('clayer-pressed');
      this.$element.removeClass('clayer-dragknob-show-label');
      clayer.makeCall(this.callbacks, 'dragStart');
    },

    dragMove: function(x, y) {
      clayer.makeCall(this.callbacks, 'dragMove', arguments);
    },

    dragEnd: function() {
      this.$element.removeClass('clayer-pressed');
      clayer.makeCall(this.callbacks, 'dragEnd');
    },

    dragTap: function() {
      this.$element.addClass('clayer-dragknob-show-label');
      clayer.makeCall(this.callbacks, 'dragTap');
    }
  };
})();





// Generated by CoffeeScript 1.6.1
(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define(['scripts/backbone', 'scripts/timbre'], function(Backbone, T) {
    var GlassModel, GlassSoundView, GlassView, Main, Wobbler, clamp,
      _this = this;
    clamp = function(min, max, value) {
      return Math.min(max, Math.max(min, value));
    };
    Wobbler = (function(_super) {

      __extends(Wobbler, _super);

      function Wobbler() {
        return Wobbler.__super__.constructor.apply(this, arguments);
      }

      Wobbler.prototype.defaults = {
        amplitude: 0,
        velocity: 0,
        mass: 50,
        damping: 0.95,
        k: 1.2
      };

      Wobbler.prototype.wobble = function(velocity) {
        if (this.attributes.velocity > 0) {
          this.set('velocity', clamp(-5, 5, this.attributes.velocity + velocity));
        } else {
          this.set('velocity', clamp(-5, 5, this.attributes.velocity - velocity));
        }
        return this.setInterval();
      };

      Wobbler.prototype.setInterval = function() {
        var _ref,
          _this = this;
        return (_ref = this.interval) != null ? _ref : this.interval = window.setInterval((function() {
          return _this.tick();
        }), 10);
      };

      Wobbler.prototype.clearInterval = function() {
        if (this.interval != null) {
          window.clearInterval(this.interval);
          return this.interval = null;
        }
      };

      Wobbler.prototype.tick = function() {
        var acceleration;
        this.set('amplitude', clamp(-100, 100, this.attributes.amplitude + this.attributes.velocity));
        acceleration = this.attributes.amplitude / this.attributes.mass * this.attributes.k;
        this.set('velocity', clamp(-5, 5, this.attributes.velocity - acceleration) * this.attributes.damping);
        if (Math.abs(this.attributes.velocity) < 0.01 && Math.abs(this.attributes.amplitude) < 0.01) {
          return this.clearInterval();
        }
      };

      return Wobbler;

    })(Backbone.Model);
    GlassModel = (function(_super) {

      __extends(GlassModel, _super);

      function GlassModel() {
        return GlassModel.__super__.constructor.apply(this, arguments);
      }

      GlassModel.prototype.initialize = function() {
        this.on('change:width change:height change:formula', this.calculate);
        this.on('change:width change:height change:formula', this.clearFillInterval);
        return this.calculate();
      };

      GlassModel.prototype.mass = function(volume) {
        return this.attributes.massPerVolume * volume;
      };

      GlassModel.prototype.waterHue = function() {
        var max, min;
        min = 40;
        max = 70;
        return (clamp(min, max, this.waterNoteRawNumber(this.attributes.waterVolume)) - min) / (max - min) * 360;
      };

      GlassModel.prototype.waterNoteRawNumber = function(volume) {
        return 12 * Math.log(this.waterToneFrequency(volume) / 440) / Math.log(2) + 49;
      };

      GlassModel.prototype.waterNoteNumber = function(volume) {
        var number;
        number = this.waterNoteRawNumber(volume);
        if (Math.abs(Math.round(number) - number) < 0.1) {
          return Math.round(number);
        } else {
          return null;
        }
      };

      GlassModel.prototype.notes = 'G# A A# B C C# D D# E F F# G'.split(' ');

      GlassModel.prototype.waterNoteName = function(volume) {
        var noteNumber;
        noteNumber = this.waterNoteNumber(volume);
        if (noteNumber != null) {
          return this.notes[noteNumber % 12];
        } else {
          return '';
        }
      };

      GlassModel.prototype.waterToneFrequency = function(volume) {
        return this.attributes.baseFrequency - this.mass(volume);
      };

      GlassModel.prototype.volumeForHeight = function(height) {
        var _ref;
        return (_ref = this.volumes[height]) != null ? _ref : 0;
      };

      GlassModel.prototype.calculate = function() {
        var shapeVolume, shapeY, width, _i, _ref, _results;
        shapeVolume = 0;
        this.widths = [];
        this.volumes = [];
        _results = [];
        for (shapeY = _i = 0, _ref = this.attributes.height; 0 <= _ref ? _i <= _ref : _i >= _ref; shapeY = 0 <= _ref ? ++_i : --_i) {
          width = 2 * this.xFromCenterForShape(shapeY);
          shapeVolume += width;
          this.widths[shapeY] = width;
          _results.push(this.volumes[shapeY] = shapeVolume);
        }
        return _results;
      };

      GlassModel.prototype.currentWaterShapeHeight = function() {
        return this.waterShapeHeight(this.attributes.waterVolume);
      };

      GlassModel.prototype.waterShapeHeight = function(volume) {
        return _.sortedIndex(this.volumes, volume);
      };

      GlassModel.prototype.xFromCenterForShape = function(shapeY) {
        var fraction;
        fraction = shapeY / this.attributes.height;
        return this.attributes.formula(fraction) * this.attributes.width / 2;
      };

      GlassModel.prototype.topWidth = function() {
        return this.widths[this.attributes.height] / 2;
      };

      GlassModel.prototype.minimumWidth = function() {
        return this.widths[1];
      };

      GlassModel.prototype.volumeDifference = function(height) {
        return this.volumes[height] - this.attributes.waterVolume;
      };

      GlassModel.prototype.animateTowardHeight = function(height) {
        var _this = this;
        this.clearFillInterval();
        return this.fillInterval = window.setInterval((function() {
          return _this.moveTowardHeight(height, _this.volumeDifference(height) / 15);
        }), 15);
      };

      GlassModel.prototype.clearFillInterval = function() {
        if (this.fillInterval != null) {
          return window.clearInterval(this.fillInterval);
        }
      };

      GlassModel.prototype.moveTowardHeight = function(height, fillVolume) {
        var volumeDifference;
        volumeDifference = this.volumeDifference(height);
        if (Math.abs(volumeDifference) <= fillVolume) {
          this.set('waterVolume', this.volumes[height]);
          return this.clearFillInterval();
        } else {
          return this.set('waterVolume', this.attributes.waterVolume + fillVolume);
        }
      };

      GlassModel.prototype.wobbleFactor = function(height) {
        return this.attributes.wobbleFormula(height / this.attributes.height) * this.attributes.height;
      };

      return GlassModel;

    })(Backbone.Model);
    GlassSoundView = (function(_super) {

      __extends(GlassSoundView, _super);

      function GlassSoundView() {
        return GlassSoundView.__super__.constructor.apply(this, arguments);
      }

      GlassSoundView.prototype.initialize = function() {
        this.listenTo(this.model, 'change', this.updateOsc);
        this.listenTo(this.model, 'playing:start', this.startPlaying);
        this.listenTo(this.model, 'playing:stop', this.stopPlaying);
        this.osc = T('osc', {
          wave: 'sin'
        });
        return this.updateOsc();
      };

      GlassSoundView.prototype.updateOsc = function() {
        return this.osc.set('freq', this.model.waterToneFrequency(this.model.get('waterVolume')));
      };

      GlassSoundView.prototype.startPlaying = function() {
        return this.osc.play();
      };

      GlassSoundView.prototype.stopPlaying = function() {
        return this.osc.pause();
      };

      return GlassSoundView;

    })(Backbone.View);
    GlassView = (function(_super) {

      __extends(GlassView, _super);

      function GlassView() {
        return GlassView.__super__.constructor.apply(this, arguments);
      }

      GlassView.prototype.className = 'glass-view';

      GlassView.prototype.events = {
        'mousedown canvas': 'onClick',
        'mousemove canvas': 'onMouseMove',
        'mouseleave canvas': 'onMouseLeave',
        'mousedown .glass-view-finger': 'onClickFinger'
      };

      GlassView.prototype.initialize = function() {
        this.listenTo(this.model, 'change', this.updateCanvas);
        this.wobbler = new Wobbler;
        this.listenTo(this.wobbler, 'change:amplitude', this.updateCanvas);
        return this.soundView = new GlassSoundView({
          model: this.model
        });
      };

      GlassView.prototype.shapeHeightByEvent = function(e) {
        var height, y;
        y = e.pageY - this.$canvas.offset().top;
        height = this.model.get('gadgetHeight') - y;
        if (height >= 0 && height < this.model.get('height')) {
          return Math.round(height);
        } else {
          return null;
        }
      };

      GlassView.prototype.onClick = function(e) {
        var height;
        height = this.shapeHeightByEvent(e);
        if (height != null) {
          this.model.animateTowardHeight(height);
          return this.wobbler.wobble(1 * this.model.volumeDifference(height) / this.model.get('width') / this.model.get('height'));
        }
      };

      GlassView.prototype.onMouseMove = function(e) {
        this.hoverHeight = this.shapeHeightByEvent(e);
        return this.updateCanvas();
      };

      GlassView.prototype.onMouseLeave = function() {
        this.hoverHeight = null;
        return this.updateCanvas();
      };

      GlassView.prototype.render = function() {
        this.$el.append("<canvas class=\"glass-view-canvas\"></canvas>\n<img class=\"glass-view-finger\" src=\"assets/finger-small.png\"></img>\n\n<style type=\"text/css\">\n  .glass-view {\n    position: relative;\n    overflow: hidden;\n  }\n\n  .glass-view-finger {\n    position: absolute;\n    margin-left: -25px;\n    margin-bottom: -2px;\n    opacity: 0.1;\n    cursor: pointer;\n  }\n\n  .glass-view-finger:hover {\n    opacity: 0.4;\n  }\n\n  .glass-view-finger-active {\n    opacity: 0.7;\n  }\n\n  .glass-view-finger-active:hover {\n    opacity: 1.0;\n  }\n</style>");
        this.renderCanvas();
        this.renderFinger();
        this.updateCanvas();
        return this;
      };

      GlassView.prototype.renderCanvas = function() {
        this.$canvas = this.$('.glass-view-canvas');
        this.$canvas.attr('width', this.model.get('gadgetWidth'));
        this.$canvas.attr('height', this.model.get('gadgetHeight'));
        return this.context = this.$canvas[0].getContext('2d');
      };

      GlassView.prototype.renderFinger = function() {
        this.$finger = this.$('.glass-view-finger');
        this.$finger.css('bottom', this.model.get('height'));
        return this.updateFinger();
      };

      GlassView.prototype.startPlaying = function() {
        var _this = this;
        this.$finger.addClass('glass-view-finger-active');
        this.fingerTime = Math.PI / 2;
        this.clearFingerInterval();
        this.fingerInterval = window.setInterval((function() {
          return _this.updateFinger();
        }), 50);
        return this.model.trigger('playing:start');
      };

      GlassView.prototype.stopPlaying = function() {
        this.$finger.removeClass('glass-view-finger-active');
        this.fingerTime = null;
        this.clearFingerInterval();
        return this.model.trigger('playing:stop');
      };

      GlassView.prototype.updateFinger = function() {
        if (this.fingerTime != null) {
          this.$finger.css('left', this.model.get('gadgetWidth') / 2 + Math.cos(this.fingerTime) * this.model.topWidth());
          this.fingerTime += 0.1;
          if (this.fingerTime > Math.PI) {
            return this.fingerTime -= Math.PI * 2;
          }
        } else {
          return this.$finger.css('left', this.model.get('gadgetWidth') / 2);
        }
      };

      GlassView.prototype.clearFingerInterval = function() {
        if (this.fingerInterval != null) {
          window.clearInterval(this.fingerInterval);
          return this.fingerInterval = null;
        }
      };

      GlassView.prototype.onClickFinger = function() {
        if (this.fingerTime != null) {
          this.stopPlaying();
        } else {
          this.startPlaying();
        }
        return this.updateFinger();
      };

      GlassView.prototype.updateCanvas = function() {
        this.clearCanvas();
        this.renderWater();
        this.renderHover();
        this.renderGlass();
        return this.renderFrequency();
      };

      GlassView.prototype.clearCanvas = function() {
        return this.context.clearRect(0, 0, this.model.get('gadgetWidth'), this.model.get('gadgetHeight'));
      };

      GlassView.prototype.renderGlass = function() {
        this.drawShape(this.model.get('height'), this.model.get('height'));
        this.context.lineWidth = 1.2;
        this.context.strokeStyle = this.model.get('borderColor');
        return this.context.stroke();
      };

      GlassView.prototype.renderWater = function() {
        var waterHeight, wobbleAmplitude;
        waterHeight = this.model.waterShapeHeight(this.model.get('waterVolume'));
        wobbleAmplitude = this.wobbler.get('amplitude') * this.model.wobbleFactor(waterHeight);
        if (Math.abs(wobbleAmplitude) < 0.5) {
          wobbleAmplitude = 0;
        }
        this.drawShape(waterHeight + wobbleAmplitude, waterHeight - wobbleAmplitude);
        this.context.fillStyle = "hsla(" + (this.model.waterHue()) + ", 100%, 50%, 0.5)";
        return this.context.fill();
      };

      GlassView.prototype.renderHover = function() {
        if (this.hoverHeight != null) {
          this.drawShape(this.hoverHeight, this.hoverHeight);
          this.context.fillStyle = "rgba(128, 128, 128, 0.07)";
          return this.context.fill();
        }
      };

      GlassView.prototype.renderFrequency = function() {
        var text, volume, x, y;
        x = this.model.get('gadgetWidth') / 2;
        y = this.model.get('gadgetHeight') - this.model.get('height') / 2;
        this.context.textAlign = 'center';
        this.context.fillStyle = "rgba(100, 100, 100, 0.5)";
        this.context.font = "Bold 28px Arial";
        text = Math.round(this.model.waterToneFrequency(this.model.get('waterVolume'))) + ' Hz';
        this.context.fillText(text, x, y - 12);
        this.context.font = "Bold 24px Arial";
        text = this.model.waterNoteName(this.model.get('waterVolume'));
        this.context.fillText(text, x, y + 12);
        if (this.hoverHeight != null) {
          x = this.model.get('gadgetWidth') / 2 + this.model.xFromCenterForShape(this.hoverHeight) + 8;
          y = this.model.get('gadgetHeight') - this.hoverHeight;
          volume = this.model.volumeForHeight(this.hoverHeight);
          this.context.textAlign = 'left';
          this.context.font = "Bold 16px Arial";
          text = Math.round(this.model.waterToneFrequency(volume)) + ' Hz';
          this.context.fillText(text, x, y);
          this.context.font = "Bold 14px Arial";
          text = this.model.waterNoteName(volume);
          return this.context.fillText(text, x, y + 15);
        }
      };

      GlassView.prototype.drawShape = function(heightLeft, heightRight) {
        var bottom, shapeY, xCenter, _i, _j;
        xCenter = this.model.get('gadgetWidth') / 2;
        bottom = this.model.get('gadgetHeight') - 1;
        this.context.beginPath();
        this.context.moveTo(xCenter, bottom);
        for (shapeY = _i = 0; 0 <= heightLeft ? _i <= heightLeft : _i >= heightLeft; shapeY = 0 <= heightLeft ? ++_i : --_i) {
          this.context.lineTo(xCenter - this.model.xFromCenterForShape(shapeY), bottom - shapeY);
        }
        for (shapeY = _j = heightRight; heightRight <= 0 ? _j <= 0 : _j >= 0; shapeY = heightRight <= 0 ? ++_j : --_j) {
          this.context.lineTo(xCenter + this.model.xFromCenterForShape(shapeY), bottom - shapeY);
        }
        this.context.lineTo(xCenter, bottom);
        return this.context.closePath();
      };

      return GlassView;

    })(Backbone.View);
    return Main = (function() {

      function Main(facade, properties, $el) {
        this.facade = facade;
        this.properties = properties;
        this.$el = $el;
        this.facade.on('configure', this.onConfigure, this);
        this.facade.on('configChange', this.onConfigurationChange, this);
        this.facade.on('render', this.onRender, this);
        this.onConfigurationChange(this.properties);
        this.facade.trigger("save", this.properties);
        this.facade.trigger("registerPropertySheet", {
          winePercentage: {
            type: 'Range',
            min: 0,
            max: 100
          },
          bladiebla: 'Password',
          sometext: {
            type: 'Text',
            dataType: 'email'
          },
          textarea: {
            type: 'TextArea',
            validators: ['required']
          },
          checkbox: 'Checkbox',
          options: {
            type: 'Select',
            options: ['aasdf asdf asdf asdf asdf asdf asdf asdf asdf asdf asdf asdf asdf ', 'b', 'c']
          },
          radio: {
            type: 'Radio',
            options: ['a', 'b', 'c']
          },
          checkboxes: {
            type: 'Checkboxes',
            options: ['aqqqqaqqqqaqqqqaqqqqaqqqqaqqqqaqqqqaqqqqaqqqqaqqqqaqqqqaqqqq', 'b', 'c']
          },
          date: {
            type: 'Date',
            yearStart: 1990,
            yearEnd: 2020
          },
          dateTime: {
            type: 'DateTime',
            minsInterval: 10
          },
          someRange: {
            type: 'Range',
            min: -10,
            max: 10,
            step: 4
          },
          number: 'Number',
          borderColor: 'Color'
        });
      }

      Main.prototype.onRender = function() {
        this.$el.append(this.glassView().render().$el);
        var $slider = $('<div/>');
        $slider.css('padding-top', 30);
        $slider.css('padding-bottom', 30);
        $slider.css('margin-left', 55);
        $slider.css('margin-top', 10);
        $slider.css('max-width', 300);
        this.$el.append($slider);
        var that = this;
        var slider = new clayer.Slider($slider, {sliderChanged: function(value) {
          that.properties.winePercentage = 100 - value / $slider.width() * 100;
          that.glassModel().set('formula', that.makeFormula(that.properties.winePercentage / 100));
        }});
        return this.$el;
      };

      Main.prototype.glassView = function() {
        return new GlassView({
          model: this.glassModel()
        });
      };

      Main.prototype.glassModel = function() {
        var _ref;
        return (_ref = this._glassModel) != null ? _ref : this._glassModel = new GlassModel({
          gadgetWidth: 400,
          gadgetHeight: 400,
          width: 300,
          height: 300,
          waterVolume: 0,
          massPerVolume: 0.007,
          baseFrequency: 880,
          borderColor: '#222222',
          formula: this.makeFormula(this.wineFraction),
          wobbleFormula: function(y) {
            return 0.02 / (1 + Math.exp(1 - 10 * y));
          }
        });
      };

      Main.prototype.makeFormula = function(wineFraction) {
        return function(y) {
          var wineshape;
          wineshape = Math.log(y * 1.2 + 0.01) / Math.log(10) / 2 + 1 - y * 1.2 * y * 1.2 / 5;
          return wineshape * wineFraction + (1 - wineFraction) * 0.5;
        };
      };

      Main.prototype.onConfigure = function(editable) {};

      Main.prototype.clearInterval = function() {
        if (this.formulaInterval != null) {
          return window.clearInterval(this.formulaInterval);
        }
      };

      Main.prototype.onConfigurationChange = function(properties) {
        var _base, _base1, _base2, _ref, _ref1;
        this.properties = properties;
        if ((_ref = (_base = this.properties).winePercentage) == null) {
          _base.winePercentage = 100;
        }
        if ((_ref1 = (_base1 = this.properties).someBoolean) == null) {
          _base1.someBoolean = false;
        }
        if (typeof this.properties.borderColor !== 'string') {
          this.properties.borderColor = null;
        }
        (_base2 = this.properties).borderColor || (_base2.borderColor = '#222222');
        this.glassModel().set('formula', this.makeFormula(this.properties.winePercentage / 100));
        return this.glassModel().set('borderColor', this.properties.borderColor);
      };

      return Main;

    })();
  });

}).call(this);
