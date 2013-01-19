;(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        root['SolitaireWin'] = factory();
    }
})(this, function() {

  if (typeof jQuery === 'undefined') {
   jQuery = require('jquery-browserify');
  }
  if (typeof async === 'undefined') {
   async = require('async');
  }

  var $ = jQuery;
  var requestAnimationFrame = window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback) {
        setTimeout(callback, 1000 / 60);
      };

  var options = {
    path: 'static/img/',
    images: [
      'cool.png',
      'great.gif',
      'awesome.jpg'
    ],
    fps: 24
  }

  var SolitaireWin = function(options) {
    this.viewport = options.viewport;
    this.$viewport = $(this.viewport);
    this.path = this.resolvePath(options.path);
    this.filenames = options.images || [];
    this.images = [];
    this.imageMaxWidth = 0;
    this.imageMaxHeight = 0;
    this.w = this.$viewport.width();
    this.h = this.$viewport.height();
    this.isLoaded = false;
    this.isLoading = false;

    this.setupDOM();

    this.$canvas = this.$viewport.find('canvas');
    this.canvas = this.$canvas[0];
    this.ctx = this.canvas.getContext('2d');
  };

  SolitaireWin.prototype.resolvePath = function(path) {
    if (path) {
      return path.charAt(path.length - 1) === '/' ? path : path + '/';
    } else {
      return '';
    }
  };

  SolitaireWin.prototype.setupDOM = function() {
    var canvas = document.createElement('canvas');
    this.$viewport.addClass('sw-viewport').css({
      'position': 'relative',
      'top': 0,
      'overflow': 'hidden'
    }).append(canvas);
  };

  SolitaireWin.prototype.start = function() {
    var that = this;
    if (this.isLoaded) {
      this.draw();
    } else {
      $(this).one('load', function() {
        that.start();
      });
      if (!this.isLoading) {
        this.load();
      }
    }
  };

  SolitaireWin.prototype.load = function(callback) {
    callback = callback || function() {};
    var that = this;
    this.isLoading = true;
    this.loadImages(function(err) {
      if (err) {
        callback(err);
      } else {
        that.isLoading = false;
        that.isLoaded = true;
        $(that).triggerHandler('load');
        callback();
      }
    });
  };

  SolitaireWin.prototype.loadImages = function(callback) {
    var that = this;
    async.forEach(this.filenames, function(filename, callback) {
      var image = new Image();
      image.onload = function() {
        that.imageMaxWidth = Math.max(that.imageMaxWidth, image.width);
        that.imageMaxHeight = Math.max(that.imageMaxWidth, image.height);
        callback();
      };
      image.onerror = function() {
        var i = that.images.indexOf(image);
        that.images = that.images.splice(i, 1);
        console.warn('Could not load image.', image);
        callback();
      };
      image.src = that.path + filename;
      that.images.push(image);
    }, callback);
  };

  SolitaireWin.prototype.draw = function() {
    console.log('Draw! :)');
    // Set up.
    var canvas = this.canvas;
    var ctx = this.ctx;
    var images = this.images;
    var w = this.w;
    var h = this.h;
    var imageMaxWidth = this.imageMaxWidth;
    var imageMaxHeight = this.imageMaxHeight;
    var realW = w + this.imageMaxWidth * 2;
    var realH = h + this.imageMaxHeight;
    this.$canvas.attr({
      'width': realW + 'px',
      'height': realH + 'px'
    });
    this.$canvas.css({
      //'position': 'absolute',
      //'left': -imageMaxWidth,
      //'top': -imageMaxHeight
    });

    // Parameters
    var vMax = 4;
    var vMin = 2;
    var gMax = -.008;
    var gMin = -.001;
    var bounceMax = 1.8;
    var bounceMin = 1.3;
    var refresh = 4;
    var initVy = .000001;

    // Initialization
    var t = 0;
    var bounce = 0;
    var x = -99999;
    var y = 0;
    var Vx = 0;
    var Vy = 0;
    var g = -.002;
    var card = {};
    var imageWidth = -1;
    var imageHeight = -1;
    //console.log('this', this);
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 25, 25);
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, 1, 1);

    function update() {
      // Calculate next stuf to check for offscreen/peak
      var nextY = y + Vy;
      var nextVy = Vy + -1*g*t;

      if (x >= realW - imageMaxWidth ||
          x <= 0 + imageMaxWidth - imageWidth) {
        bounce = bounceMin + Math.random() * (bounceMax-bounceMin);
        image = images[randomIntBetween(0, images.length - 1)];
        imageWidth = image.width;
        imageHeight = image.height;
        y = 0 + imageMaxHeight - imageHeight;

        x = Math.random() * w;

        //console.log(x, y);

        nextY = y + Vy;
        if( x < realW * .2 ) {
          Vx = vMax - Math.random() * ((vMax-vMin)/2);
        }
        else if( x > realW * .8 ) {
          Vx = -1 * vMax - Math.random() * ((vMax-vMin)/2);
        }
        else {
          Vx = (vMin + Math.random() * (vMax-vMin)) * (Math.random() < .5 ? 1 : -1);
        }
        Vy = initVy;
        t = 0;
      }
      else if( nextY > realH - imageMaxHeight - imageHeight) {
        y = realH - imageMaxHeight - imageHeight;
        x += Vx;
        Vy = -1 * Vy / Math.pow(bounce,2);
      }
      else if( y === realH - imageMaxHeight - imageHeight) {
        if( Vy >= 0 ) {
          Vy = -1 * Vy / 1 * Math.pow(bounce,2);
        }
        t = 0;
        y += Vy;
        x += Vx;
      }
      else if( Vy <= 0 && nextVy >= 0 ) {
        t = t/bounce;
        Vy = nextVy;
        y = nextY;
        x += Vx;
      }
      else {
        x += Vx;
        y = nextY;
        ++t;
        Vy = nextVy;
      }
      x = Math.round(x);
      y = Math.round(y);
      ctx.drawImage(image, x, y);
    }

    this.animate(update);
  };

  SolitaireWin.prototype.animate = function(fn) {
    var that = this;
    var redraw = bind(fn, this);

    function next() {
      requestAnimationFrame(redraw);
      that.timeoutId = setTimeout(next, that.delay);
    }

    next();
  };

  function randomIntBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function bind(fn, obj) {
    return function() {
      fn.apply(obj, arguments);
    };
  }

  return SolitaireWin;

});
