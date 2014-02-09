<div ng-app="app">
  <section ng-controller="HarderCtrl">
    <div class="status">WebSocket: {{status}}</div>
    <h2>Hosts</h2>
    <div ng-hide="hosts.length">(No hosts detected) </div>
    <div ng-repeat="host in hosts" class="host">
      <h3>{{host.name}}</h3>
      <table>
        <tr ng-repeat="(key, value) in host.status">
          <td>{{key}}</td><td>{{value}}</td>
        </tr>
      </table>
      <button ng-click="putTask(host.name, 'eject')">Eject</button>
      <button ng-click="putTask(host.name, 'reload')">Reload</button>
      <button ng-click="putTask(host.name, 'copy')">Copy</button>
      <button ng-click="deleteHost(host.name)">Delete</button>
    </div>
    <div style="margin-top: 50px">
      <h4>Manual</h4>
      <label>Host: <input ng-model="new_host" /></label>
      <button ng-click="addHost(new_host)">Add</button>
    </div>
  </section>
</div>
