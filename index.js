;(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        root['SolitaireWin'] = factory();
    }
})(this, function() {

  var requestAnimationFrame = window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback) {
        setTimeout(callback, 1000 / 60);
      };

  var setImmediate = window.setImmediate ||
      function(fn) {
        setTimeout(fn, 0);
      };

  var SolitaireWin = function(options) {
    this.viewport = options.viewport;
    this.path = this.resolvePath(options.path);
    this.filenames = options.images || [];
    this.images = [];
    this.imageMaxWidth = 0;
    this.imageMaxHeight = 0;
    this.width = this.viewport.clientWidth;
    this.height = this.viewport.clientHeight;
    this.isLoaded = false;
    this.isLoading = false;

    this.options = options;
    this.options.n = options.n || 1;
    this.options.resize = options.resize;
  };
  SolitaireWin.prototype = new EventEmitter();

  SolitaireWin.prototype.resolvePath = function(path) {
    if (path) {
      return path.charAt(path.length - 1) === '/' ? path : path + '/';
    } else {
      return '';
    }
  };


  SolitaireWin.prototype.start = function() {
    var that = this;
    if (this.isLoaded) {
      this.setupAndStart();
    } else {
      this.on('load', function() {
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
    this.loadImages(function() {
      that.isLoading = false;
      that.isLoaded = true;
      that.emit('load');
      callback();
    });
  };

  // async loading
  SolitaireWin.prototype.loadImages = function(callback) {
    var that = this;
    var n = this.filenames.length;

    for (var i = 0; i < this.filenames.length; i++) {
      (function(i) {
        var filename = that.filenames[i];
        var image = new Image();
        image.onload = function() {
          that.imageMaxWidth = Math.max(that.imageMaxWidth, image.width);
          that.imageMaxHeight = Math.max(that.imageMaxWidth, image.height);
          next();
        };
        image.onerror = function() {
          var index = that.images.indexOf(image);
          that.images = that.images.splice(index, 1);
          console.warn('Could not load image.', image);
          next();
        };
        image.src = that.path + filename;
        that.images.push(image);
      })(i);
    }

    function next() {
      n--;
      if (n === 0) {
        setImmediate(callback);
      }
    }
  };

  SolitaireWin.prototype.setup = function() {
    this.world = new World({
      minVx: this.options.minVx || 5,
      maxVx: this.options.maxVx || 10,
      minVy: this.options.minVy || 1,
      maxVy: this.options.maxVy || 25,
      images: this.images,
      width: this.width,
      height: this.height,
      n: this.options.n,
      bounce: this.options.bounce || 0.75,
      gravity: this.options.gravity || 0.75,
      spawnArea: this.options.spawnArea
    });
    this.setupDOM();
    this.canvas = document.querySelector('.sw-viewport .sw-canvas');
    this.ctx = this.canvas.getContext('2d');
    if (this.options.resize) {
      window.addEventListener('resize',
          bind(this.onResize, this));
    }
  };

  SolitaireWin.prototype.setupAndStart = function() {
    this.setup();
    this.animate(this.step);
    this.world.start();
  };

  SolitaireWin.prototype.setupDOM = function() {
    var canvas = document.createElement('canvas');
    canvas.className += ' sw-canvas';
    canvas.style.width = 'auto';
    canvas.style.height = 'auto';
    canvas.setAttribute('width', this.width);
    canvas.setAttribute('height', this.height);
    this.viewport.className += ' sw-viewport';
    this.viewport.appendChild(canvas);
  };

  SolitaireWin.prototype.step = function() {
    var that = this;
    this.world.step(function(particle) {
      var coords = that.getClipCoords(particle);
      that.ctx.drawImage(coords.image, coords.sx, coords.sy,
          coords.width, coords.height,
          coords.dx, coords.dy,
          coords.width, coords.height);
    });
  };

  SolitaireWin.prototype.getClipCoords = function(particle) {
    var world = this.world;
    var deltaX = world.width - particle.x;
    var deltaY = world.height - particle.y;
    var coords = {
      image: particle.image,
      sx: 0,
      sy: 0,
      dx: particle.x,
      dy: particle.y,
      width: particle.width,
      height: particle.height
    };
    if (deltaX < particle.width) {
      coords.width = deltaX;
    } else if (deltaX > world.width) {
      var offsetX = deltaX - world.width;
      coords.dx = 0;
      coords.sx = offsetX;
      coords.width = particle.width - offsetX;
    }
    if (deltaY > world.height) {
      var offsetY = deltaY - world.height;
      coords.dy = 0;
      coords.sy = offsetY;
      coords.height = particle.height - offsetY;
    }
    return coords;
  };

  SolitaireWin.prototype.animate = function(step) {
    var that = this;
    function keyframe() {
      that.step();
      requestAnimationFrame(keyframe);
    }
    keyframe();
  };

  SolitaireWin.prototype.onResize = function(e) {
    var width = this.viewport.clientWidth;
    var height = this.viewport.clientHeight;
    this.setDimensions(width, height);
    this.world.setDimensions(width, height);
  };

  SolitaireWin.prototype.setDimensions = function(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.setAttribute('width', width);
    this.canvas.setAttribute('height', height);
  };

  function World(options) {
    this.minVx = options.minVx || 1;
    this.maxVx = options.maxVx || 10;
    this.minVy = options.minVy || 1;
    this.maxVy = options.maxVy || 10;
    this.images = options.images;
    //this.prerendered = [];
    this.particles = [];
    this.width = options.width;
    this.height = options.height;
    this.bounce = options.bounce || .75;
    this.gravity = options.gravity || 0.98;
    this.n = options.n || 1;
    this.frequency = options.frequency || 1000;
    this.spawnArea = options.spawnArea || 0.8;

    this.on('dead', bind(this.onDead, this));
  };
  World.prototype = new EventEmitter();

  World.prototype.start = function() {
    for (var i = 0; i < this.n; i++) {
      this.generateParticle();
    };
  };

  World.prototype.generateParticle = function() {
    this.particles.push(this.getNextParticle());
  };

  World.prototype.setDimensions = function(width, height) {
    this.width = width;
    this.height = height;
  };

//  World.prototype.prerenderImages = function() {
//    var that = this;
//    $.each(this.images, function(i, image) {
//      var canvas = document.createElement('canvas');
//      $(canvas).attr({
//        'width': image.width,
//        'height': image.height
//      });
//      var ctx = canvas.getContext('2d');
//      ctx.drawImage(image, 0, 0);
//      that.prerendered.push(canvas);
//    });
//  };

  World.prototype.step = function(callback) {
    var that = this;
    var length = this.particles.length;
    for (var i = 0; i < length; i++) {
      (function() {
        var particle = that.particles[i];
        that.stepParticle(particle);
        if (!that.isDead(particle)) {
            if (that.isBounce(particle)) {
              that.bounceParticle(particle);
            }
            callback(particle);
        } else {
          that.particles.splice(i, 1);
          i--; length--;
          that.emit('dead');
        }
      })();
    }
  };

  World.prototype.onDead = function(e) {
    this.generateParticle();
  };

  World.prototype.stepParticle = function(particle) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy = particle.vy + this.gravity > this.maxVy ?
      this.maxVy :
      particle.vy + this.gravity;
  };

  World.prototype.isDead = function(particle) {
    if (particle.x > this.width ||
        particle.x < 0 - particle.width) {
      return true;
    }
  };

  World.prototype.isBounce = function(particle) {
    if (particle.y > this.height - particle.height) {
      return true;
    }
  };

  World.prototype.bounceParticle = function(particle) {
    particle.y = this.height - particle.height;
    particle.vy = -particle.vy * this.bounce;
  };

  World.prototype.getNextParticle = function() {
    var image = this.images[randomIntBetween(0, this.images.length - 1)];
//    var image = this.prerendered[
//      randomIntBetween(0, this.prerendered.length - 1)
//    ];
    return new Particle({
      image: image,
      vx: this.getRandomVx(),
      vy: this.getRandomVy(),
      x: this.getRandomX(),
      y: -image.height
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
    var margin = ((1 - this.spawnArea) * this.width) / 2;
    return randomIntBetween(margin, this.width - margin);
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

  function EventEmitter() {};

  EventEmitter.prototype.listeners = {};

  EventEmitter.prototype.on = function(eventName, listener) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [listener];
    } else {
      this.listeners[eventName].push(listener);
    }
  };

  EventEmitter.prototype.emit = function(eventName) {
    var listeners = this.listeners[eventName];
    if (listeners) {
      for (var i = 0; i < listeners.length; i++) {
        setImmediate(listeners[i]);
      }
    }
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
