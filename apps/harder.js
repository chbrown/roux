/*jslint node: true */
var _ = require('underscore');
var amulet = require('amulet');
var async = require('async');
var http = require('http-enhanced');
var logger = require('loge');
var redis = require('redis');
var Router = require('regex-router');
var ws = require('ws');

var ns = function() {
  return Array.prototype.concat.apply(['harder'], arguments).join(':');
};

var action_server = new ws.Server({noServer: true});

(function() {
  // subscribe to 'harder:*:action' pattern
  var client = redis.createClient();
  client.on('pmessage', function(pattern, channel, message) {
    logger.info('action received:', pattern, channel, message);
    var host = channel.split(':')[1];
    action_server.clients.forEach(function(client) {
      // {host: host, action: message}
      // nvm, send them across the websocket wire as a simple string like ":host=:action"
      client.send(host + '=' + message);
    });
  });
  client.psubscribe(ns('*', 'action'), function(err, pattern) {
    logger.info('psubscribe result = %s', pattern);
  });
})();

var R = new Router(function(req, res) {
  res.die(404, 'No resource at: ' + req.url);
});

var die = function(res, err) {
  logger.error('500 ERR:', err);
  return res.die('Server Error: ' + err.toString());
};

/** Websocket listener
Upgrade request and add it to the server */
R.any('/apps/harder/action', function(req) {
  action_server.handleUpgrade(req, req.socket, req.upgradeHead, function(client) {
    logger.debug('websocket connection established for harder (url: %s)', client.upgradeReq.url);
  });
});

/** GET /
Show main page */
R.get('/apps/harder/', function(req, res) {
  amulet.stream(['layout.mu', 'apps/harder.mu'], {}).pipe(res);
});

/** GET /hosts
Get a list of the current hosts, using "KEYS harder:*" */
R.get('/apps/harder/hosts', function(req, res, m) {
  var client = redis.createClient();
  // var key = ns(m[1]);
  client.keys(ns('*'), function(err, keys) {
    if (err) return die(res, err);

    var all_hosts = keys.map(function(key) {
      return key.split(':')[1];
    });

    var hosts = _.uniq(all_hosts);

    res.json(hosts);
  });
});

/** GET /hosts/:host
Return current hash representing state of host */
R.get(/^\/apps\/harder\/hosts\/(.+)$/, function(req, res, m) {
  var client = redis.createClient();
  var host = m[1];
  client.keys(ns(host, '*'), function(err, keys) {
    if (err) return die(res, err);

    client.mget(keys, function(err, values) {
      if (err) return die(res, err);

      var suffixes = keys.map(function(key) {
        return key.split(':')[2];
      });

      res.json(_.object(_.zip(suffixes, values)));
    });
  });
});

/** PUT /hosts/:host/tasks/:task
Add task to host's task queue
*/
R.put(/^\/apps\/harder\/hosts\/(.+?)\/(\w+)$/, function(req, res, m) {
  var client = redis.createClient();
  var host = m[1];
  var task = m[2];
  client.publish(ns(host, 'task'), task, function(err, result) {
    if (err) return res.die('Redis error: ' + err.toString());

    res.json(result);
  });
});

module.exports = R.route.bind(R);
