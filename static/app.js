/*jslint browser: true, devel: true */ /*globals _, p, angular, Url, Textarea */
var app = angular.module('app', ['ngStorage']);

var indexWhere = function(xs, props) {
  for (var i = 0, imax = xs.length; i < imax; i++) {
    var x = xs[i];
    for (var key in props) {
      if (x[key] != props[key]) {
        continue;
      }
    }
    return i;
  }
  return -1;
};

app.filter('keys', function() {
  return Object.keys;
});

app.directive('log', function() {
  return {
    restrict: 'E',
    templateUrl: '/static/log.html',
    scope: {
      lines: '='
    }
  };
});

app.directive('json', function() {
  return {
    restrict: 'E',
    templateUrl: '/static/json.html',
    replace: true,
    scope: {},
    require: 'ngModel',
    link: function(scope, el, attrs, ngModel) {
      ngModel.$formatters.push(function(model) {
        // convert a list of javascript entities into strings
        return model.map(function(item) {
          return JSON.stringify(item, null, '  ');
        });
      });
      ngModel.$render = function() {
        scope.items = ngModel.$viewValue;
      };
    }
  };
});

app.directive('enhanced', function() {
  return {
    restrict: 'A',
    link: function(scope, el, attrs) {
      Textarea.enhance(el[0]);
    }
  };
});



app.controller('HarderCtrl', function($scope, $http) {
  var app_prefix = '/apps/harder';
  $scope.hosts = [];

  $scope.putTask = function(host, task) {
    $http({method: 'PUT', url: app_prefix + '/hosts/' + host + '/' + task}).then(function(res) {
      // p('PUT /hosts/:host/' + task, res.data);
    });
  };

  $scope.refresh = function(host) {
    $http({method: 'GET', url: app_prefix + '/hosts/' + host}).then(function(res) {
      $scope.updateHost(host, res.data);
    });
  };

  $scope.addHost = function(host) {
    $scope.updateHost(host, {action: 'Manually added'});
  };

  $scope.updateHost = function(name, status) {
    var index = indexWhere($scope.hosts, {name: name});
    if (index == -1) {
      $scope.hosts.push({name: name, status: status});
    }
    else {
      _.extend($scope.hosts[index].status, status);
    }
  };

  $scope.deleteHost = function(host) {
    var index = indexWhere($scope.hosts, {name: name});
    $scope.hosts.splice(index, 1);
  };

  $http({method: 'GET', url: app_prefix + '/hosts'}).then(function(res) {
      // res has .data, .status, .headers, and .config values
      res.data.forEach($scope.refresh);
    }, function(res) {
      p('GET /hosts error', res);
    });

  // set up websockets
  var ws_url = Url.parse(window.location).merge({protocol: 'ws'});
  var action_websocket = new WebSocket(ws_url.merge({path: app_prefix + '/action'}));
  action_websocket.onmessage = function(ev) {
    // action messages consist of a host and a message arising from that host
    // the local server combines them for the benefit of sending them across websockets to this app
    // but in redis they are send across unique channels.
    // because the host is a given, they will all look like ":host=:action"
    var parts = ev.data.split('=');
    var host = parts[0];
    var action = parts[1];
    $scope.$apply(function() {
      $scope.updateHost(host, {action: action});
      if (action == 'ready' || action == 'change') {
        // we only refresh when we know there are new going to be new variables
        $scope.refresh(host);
      }
    });
  };
  action_websocket.onclose = function(ev) {
    p('oh no, closing!', ev);
  };
  action_websocket.onerror = function(ev) {
    p('action websocket error:', ev);
  };
});

app.controller('MonitorCtrl', function($scope) {
  $scope.monitor = [];

  var monitor_websocket_url = Url.parse(window.location).merge({protocol: 'ws', path: '/monitor'});
  var monitor_websocket = new WebSocket(monitor_websocket_url);
  // monitor_websocket.addEventListener('message', function(ev) {})
  monitor_websocket.onmessage = function(ev) {
    $scope.$apply(function() {
      $scope.monitor.push(ev.data);
    });
  };
});

app.controller('WorkerCtrl', function($scope, $localStorage, $http) {
  var app_prefix = '/apps/worker';

  $scope.queue = [];
  $scope.incomplete = [];
  $scope.done = [];

  var glob = function(pattern, callback) {
    // callback signature: function(err, filenames)
    // e.g., callback(null, ['13a.txt', '14b.txt', '15c.csv']);
    p('expanding glob on server:', pattern);
    $http({method: 'POST', url: app_prefix + '/glob', data: pattern}).then(function(res) {
        // res has .data, .status, .headers, and .config values
        callback(null, res.data);
      }, function(res) {
        p('$http glob resolution failed', res);
        callback(res);
      });
  };

  $scope.$storage = $localStorage.$default({
    func: [
      'function(callback) {',
      '  callback(err, tasks);',
      '}',
      ''
    ].join('\n')
  });

  var getTasks = function(callback) {
    // not sure why the parens are needed
    var func_expression = '(' + $scope.$storage.func + ')';
    var func = eval(func_expression);
    func(function(err, tasks) {
      // force func to behave async (to avoid double-$apply'ing)
      setTimeout(function() {
        callback(err, tasks);
      }, 0);
    });
  };

  $scope.evaluate = function() {
    getTasks(function(err, tasks) {
      $scope.$apply(function() {
        $scope.preview = tasks;
      });
    });
  };

  $scope.add = function() {
    getTasks(function(err, tasks) {
      $scope.$apply(function() {
        Array.prototype.push.apply($scope.queue, tasks);
      });
    });
  };

});
