/*jslint node: true */
var _ = require('underscore');
var amulet = require('amulet');
var fs = require('fs');
var path = require('path');
var async = require('async');
var http = require('http-enhanced');
var logger = require('loge');
var redis = require('redis');
var Router = require('regex-router');

var R = new Router(function(req, res) {
  res.die(404, 'No resource at: ' + req.url);
});

R.any(/^\/(static|favicon)/, require('./static'));
R.any(/^\/monitor/, require('./monitor'));

// attach the apps
var apps_dirpath = path.join(__dirname, '..', 'apps');
fs.readdir(apps_dirpath, function(err, files) {
  if (err) throw err;

  files.filter(function(file) {
    return file.match(/js$/);
  }).forEach(function(file) {
    var regex = new RegExp('^/apps/' + file.replace('.js', ''));
    logger.info('Attaching app:', file, regex);
    R.any(regex, require(path.join(apps_dirpath, file)));
  });
});

module.exports = R.route.bind(R);
