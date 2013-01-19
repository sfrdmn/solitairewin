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

  var SolitaireWin = function(options) {
    this.viewport = options.viewport;
    this.$viewport = $(this.viewport);
    this.path = this.resolvePath(options.path);
    this.filenames = options.images || [];
    this.images = [];
    this.imageMaxWidth = 0;
    this.imageMaxHeight = 0;
    this.width = this.$viewport.width();
    this.height = this.$viewport.height();
    this.fps = options.fps || 60;
    this.delay = 1000 / this.fps;
    this.isLoaded = false;
    this.isLoading = false;

    this.setupViewport();

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

  SolitaireWin.prototype.setupViewport = function() {
    var canvas = document.createElement('canvas');
    $(canvas).css({
      'width': 'auto',
      'height': 'auto'
    });
    this.$viewport.addClass('sw-viewport').css({
      'position': 'relative',
      'top': 0,
      'overflow': 'hidden'
    }).append(canvas);
  };

  SolitaireWin.prototype.start = function() {
    var that = this;
    if (this.isLoaded) {
      this.startAnimation();
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

  SolitaireWin.prototype.startAnimation = function() {
    this.setupWorld();
    this.setupCanvas();
    this.animate(this.step);
  };

  SolitaireWin.prototype.setupWorld = function() {
    this.world = new World({
      minVx: 5,
      maxVx: 10,
      minVy: 1,
      maxVy: 25,
      images: this.images,
      width: this.width,
      height: this.height,
      marginX: this.imageMaxWidth,
      marginY: this.imageMaxHeight,
      bounce: 0.75,
      gravity: .75
    });
  };

  SolitaireWin.prototype.setupCanvas = function() {
    console.log(this.world);
    this.$canvas.attr({
      'width': this.world.realWidth + 'px',
      'height': this.world.realHeight + 'px'
    });
    this.$canvas.css({
      'position': 'absolute',
      'left': -this.world.marginX,
      'top': -this.world.marginY
    });
  };

  SolitaireWin.prototype.step = function() {
    var ctx = this.ctx;
    this.world.step(function(particle) {
      ctx.drawImage(particle.image, particle.x, particle.y);
    });
  };

  SolitaireWin.prototype.animate = function(step) {
    var that = this;
    function next() {
      requestAnimationFrame(bind(step, that));
      that.timeoutId = setTimeout(next, that.delay);
    }
    next();
  };

  function World(options) {
    this.minVx = options.minVx || 1;
    this.maxVx = options.maxVx || 10;
    this.minVy = options.minVy || 1;
    this.maxVy = options.maxVy || 10;
    this.images = options.images;
    this.particles = [];
    this.width = options.width;
    this.height = options.height;
    this.marginX = options.marginX;
    this.marginY = options.marginY;
    this.realWidth = this.width + this.marginX * 2;
    this.realHeight = this.height + this.marginY;
    this.bounce = options.bounce || .75;
    this.gravity = options.gravity || 0.98;

    this.particles.push(this.getNextParticle());
  };

  World.prototype.step = function(callback) {
    var that = this;
    var hasDied = false;
    this.particles = $.grep(this.particles, function(particle) {
      that.stepParticle(particle);
      if (!that.isDead(particle)) {
          if (that.isBounce(particle)) {
            that.bounceParticle(particle);
          }
          callback(particle);
          return true;
      } else {
        console.log('deda!');
        hasDied = true;
      }
    });
    if (hasDied) {
      this.particles.push(that.getNextParticle());
    }
  };

  World.prototype.stepParticle = function(particle) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy = particle.vy + this.gravity > this.maxVy ?
      this.maxVy :
      particle.vy + this.gravity;
  };

  World.prototype.isDead = function(particle) {
    if (particle.x > this.realWidth - this.marginX ||
        particle.x < this.marginX - particle.width) {
      return true;
    }
  };

  World.prototype.isBounce = function(particle) {
    if (particle.y > this.realHeight - particle.height) {
      return true;
    }
  };

  World.prototype.bounceParticle = function(particle) {
    particle.y = this.realHeight - particle.height;
    particle.vy = -particle.vy * this.bounce;
  };

  World.prototype.getNextParticle = function() {
    var image = this.images[randomIntBetween(0, this.images.length - 1)];
    return new Particle({
      image: image,
      vx: this.getRandomVx(),
      vy: this.getRandomVy(),
      x: this.getRandomX(),
      y: this.marginY - image.height
    });
  };

  World.prototype.getRandomVx = function() {
    var sign = Math.random() < 0.5 ? -1 : 1;
    return sign * randomIntBetween(this.minVx, this.maxVx);
  };

  World.prototype.getRandomVy = function() {
    return randomIntBetween(this.minVy, this.maxVy / 4);
  };

  World.prototype.getRandomX = function() {
    return randomIntBetween(this.marginX + this.width * .25,
        this.marginX + this.width * .75);
  };

  function Particle(options) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    this.image = options.image;
    this.width = this.image.width;
    this.height = this.image.height;
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
