/*jslint browser: true */ /*globals _, Url */
var setCountdown = function(callback, timeout, opts) {
  /** set up a timeout, along with optional interval

  callback: function()
  timeout: Number
      milliseconds to wait before calling `callback()`
  opts:
      progress: function(Number)
          called with a single argument: milliseconds remaining before
      interval: Number
          milliseconds between progress calls
  */
  // prepare the interval for clearing
  var progress_interval = null;
  // set up main required timeout
  setTimeout(function() {
    clearInterval(progress_interval);
    callback();
  }, timeout);

  // if opts.progress and opts.interval are provided, create an interval
  if (opts && opts.progress && opts.interval) {
    var elapsed = 0;
    progress_interval = setInterval(function() {
      elapsed += opts.interval;
      opts.progress(timeout - elapsed);
    }, opts.interval);
  }
};

var EventEmitter = (function() {
  var EventEmitter = function() {
    // EventEmitter is an extensible class with .on() and .emit() methods
    this.events = {};
  };
  EventEmitter.prototype.on = function(name, callback, context) {
    if (this.events[name] === undefined) this.events[name] = [];
    this.events[name].push({fn: callback, thisArg: context});
    return this;
  };
  EventEmitter.prototype.off = function(name, callback) {
    for (var i = (this.events[name] ? this.events[name].length : 0) - 1; i >= 0; i--) {
      if (this.events[name][i].callback === callback) {
        this.events[name].splice(i, 1);
      }
    }
  };
  EventEmitter.prototype.emit = function(name /*, args*/) {
    var length = this.events[name] ? this.events[name].length : 0;
    var args = Array.prototype.slice.call(arguments, 1);
    for (var i = 0; i < length; i++) {
      var handler = this.events[name][i];
      handler.fn.apply(handler.thisArg, args);
    }
  };
  return EventEmitter;
})();

var ReconnectingSocket = (function() {
  /** new ReconnectingSocket(url [, options])

  Required globals: Url, EventEmitter, setCountdown

  url: String
      This can be a partial path, in which case it will be evaluated
      relative to the current page, and will have the protocol coerced to ws://
      in any case.
  options:
      reconnect_timeout: Number (default: 5000)
          milliseconds to wait before trying to reconnect, for closed connections
          Set this to null to disable automatic reconnects

  In addition to the events emitted by a standard WebSocket, 'open', 'message',
  'error', 'close' (I'm not sure when 'error' is ever called), a
  ReconnectingSocket instance also emits a "status" event with each action
  received or taken.

  */
  var Wrapper = function(url, opts) {
    EventEmitter.call(this);
    this.url = Url.parse(url).merge({protocol: 'ws'}).toString();
    this.opts = _.extend({}, {
      reconnect_timeout: 5000,
      progress_interval: 1000,
    }, opts);
    this.connect();
  };
  // setup inheritance -- any better than new?
  Wrapper.prototype = Object.create(EventEmitter.prototype);
  // setup inheritance -- is the `constructor = ...` bit necessary?
  Wrapper.prototype.constructor = Wrapper;
  Wrapper.prototype.connect = function(url) {
    this.emit('status', 'connecting');
    // the WebSocket API reconnect process is just to make a new one
    this.websocket = new WebSocket(this.url);
    // attach events each time
    this.websocket.onopen = this.onopen.bind(this);
    this.websocket.onclose = this.onclose.bind(this);
    this.websocket.onerror = this.onerror.bind(this);
  };
  Wrapper.prototype.onopen = function(ev) {
    this.emit('status', 'open');
    this.emit('open', ev);
    // open will happen before any message, I think
    this.websocket.onmessage = this.onmessage.bind(this);
  };
  Wrapper.prototype.onmessage = function(ev) {
    this.emit('status', 'message');
    this.emit('message', ev);
  };
  Wrapper.prototype.onclose = function(ev) {
    this.emit('status', 'close');
    this.emit('close', ev);

    // both the reconnect itself...
    if (this.opts.reconnect_timeout !== null) {
      var self = this;
      var countdown_opts = {};
      // ...and the progress calls are optional
      if (this.opts.progress_interval !== null) {
        countdown_opts = {
          progress: function(t_minus_milliseconds) {
            var t_minus_string = (t_minus_milliseconds / 1000).toFixed(0);
            self.emit('status', 'opening in ' + t_minus_string + ' seconds');
          },
          interval: this.opts.progress_interval,
        };
      }
      setCountdown(this.connect.bind(this),
        this.opts.reconnect_timeout, countdown_opts);
    }
  };
  Wrapper.prototype.onerror = function(ev) {
    this.emit('status', 'error');
    this.emit('error', ev);
  };
  return Wrapper;
})();
