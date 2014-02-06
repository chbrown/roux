/*jslint node: true */
var _ = require('underscore');
var amulet = require('amulet');
var async = require('async');
var glob = require('glob');
var http = require('http-enhanced');
var logger = require('loge');
var redis = require('redis');
var Router = require('regex-router');
var ws = require('ws');

var action_server = new ws.Server({noServer: true});

var ns = function() {
  return Array.prototype.concat.apply(['worker'], arguments).join(':');
};

var R = new Router(function(req, res) {
  res.die(404, 'No resource at: ' + req.url);
});

var die = function(res, err) {
  logger.error('500 ERR:', err);
  return res.die('Server Error: ' + err.toString());
};

/** GET /
Show main page */
R.get('/apps/worker/', function(req, res) {
  amulet.stream(['layout.mu', 'apps/worker.mu'], {}).pipe(res);
});

/** POST /glob
Expand a glob on the server filesystem */
R.post('/apps/worker/glob', function(req, res, m) {
  req.readToEnd('utf8', function(err, pattern) {
    if (err) return die(res, err);

    logger.info('Expanding glob: %s', pattern);

    glob(pattern, {nocase: false}, function (err, files) {
      if (err) return die(res, err);

      res.json(files);
    });
  });
});

// /** GET /hosts/:host
// Return current hash representing state of host */
// R.get(/^\/apps\/worker\/hosts\/(.+)$/, function(req, res, m) {
//   var client = redis.createClient();
//   var host = m[1];
//   client.keys(ns(host, '*'), function(err, keys) {
//     if (err) return die(res, err);

//     client.mget(keys, function(err, values) {
//       if (err) return die(res, err);

//       var suffixes = keys.map(function(key) {
//         return key.split(':')[2];
//       });

//       res.json(_.object(_.zip(suffixes, values)));
//     });
//   });
// });

// /** PUT /hosts/:host/tasks/:task
// Add task to host's task queue
// */
// R.put(/^\/apps\/worker\/hosts\/(.+?)\/(\w+)$/, function(req, res, m) {
//   var client = redis.createClient();
//   var host = m[1];
//   var task = m[2];
//   client.publish(ns(host, 'task'), task, function(err, result) {
//     if (err) return res.die('Redis error: ' + err.toString());

//     res.json(result);
//   });
// });

module.exports = R.route.bind(R);
