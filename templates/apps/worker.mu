<div ng-app="app">
  <section ng-controller="WorkerCtrl">
    <div style="margin: 20px 0">
      <h3>Insert</h3>
      <label>
        <div>Expression:</div>
        <textarea enhanced ng-model="$storage.func" style="width: 100%"></textarea>
      </label>
      <p>
        Expression should be eval() to a function with signature function(callback), where callback has the signature:
        function(err, tasks). The tasks can be previewed, and then added to the queue.
      </p>
      <p>
        glob(pattern, callback) is a global function to expand a glob into a list of filenames on the server filesystem.
        The callback has the signature: function(err, filenames)
        It is cached per page-load.
      </p>
      <button ng-click="evaluate()">Evaluate and preview</button>
      <div style="font-size: 8pt">
        <json ng-model="preview"></json>
      </div>
      <button ng-click="add()" ng-show="preview.length">Add to queue</button>
    </div>
    <table style="width: 100%; border-top: 1px solid #CCC;">
      <tr>
        <td>
          <h4>Queue ({{queue.length}})</h4>
          <list items="queue"></list>
        </td>
        <td>
          <h4>Incomplete ({{incomplete.length}})</h4>
          <list items="incomplete"></list>
        </td>
        <td>
          <h4>Done ({{done.length}})</h4>
          <list items="done"></list>
        </td>
      </tr>
    </table>
  </section>
</div>
