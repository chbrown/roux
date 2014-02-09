<div ng-app="app">
  <section ng-controller="MonitorCtrl" class="monitor">
    <div class="status">WebSocket: {{status}}</div>
    <h2>Monitor</h2>
    <p ng-hide="monitor.length">No messages</p>
    <log lines="monitor"></log>
  </section>
</div>
