/*jslint node: true */
var ws = require('ws');
var amulet = require('amulet');
var redis = require('redis');
var logger = require('loge');
var Router = require('regex-router');

var monitor_server = new ws.Server({noServer: true});

var toLocalISOString = function(date) {
  return new Date(date.getTime() + date.getTimezoneOffset()*60*1000).toISOString().replace(/\..+/, '');
};

var R = new Router(function(req, res) {
  res.die(404, 'No resource at: ' + req.url);
});

R.any('/monitor/viewer', function(req, res) {
  amulet.stream(['layout.mu', 'monitor-viewer.mu'], {}).pipe(res);
});

R.get('/monitor', function(req, res) {
  // kind of hackish way to do this, but upgrade requests are hackworthy
  if (req.upgrade) {
    // don't use res here!
    monitor_server.handleUpgrade(req, req.socket, req.upgradeHead, function(client) {
      logger.debug('websocket connection established for monitor (url: %s)', client.upgradeReq.url);
    });
  }
  else {
    res.redirect('/monitor/viewer');
  }
});

(function monitor_loop() {
  var client = redis.createClient();
  client.monitor(function(err, res) {
    if (err) return logger.error('redis.monitor error:', err);

    logger.debug('entering redis monitoring mode');
  });
  client.on('monitor', function(time, args) {
    var date = new Date(time*1000);
    var local_datetime_str = toLocalISOString(date);
    // util.inspect(args)
    var message = local_datetime_str + ' $ ' + args.join(' ');
    // logger.debug('monitor:', message);
    monitor_server.clients.forEach(function(client) {
      client.send(message);
    });
  });
})();

module.exports = R.route.bind(R);
