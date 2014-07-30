const self = require("sdk/self");
const tabs = require("sdk/tabs");
const system = require("sdk/system");

const { XMLHttpRequest } = require("sdk/net/xhr");
const { Cc, Ci, Cu, components } = require("chrome");

Cu.import("resource://gre/modules/Preferences.jsm");

const { PREFS } = require("prefs");

var BugReporter = {
  report: function() {
    var tabUrl = tabs.activeTab.url;

    tabs.open({
      url: self.data.url("reportbug.html"),
      onReady: function(tab) {
        console.log("attaching worker");
        var worker = tab.attach({
          contentScriptFile: [self.data.url("reportbug.js")]
        });

        worker.port.emit('info', {
          tabUrl: tabUrl,
        });

        worker.port.on('post', function(data) {
          data.client.system = {};
          ['name', 'platform', 'version', 'vendor'].forEach(function(key) {
            data.client.system[key] = system[key];
          });

          console.log(data);

          var xhr = new XMLHttpRequest();
          xhr.open("POST", Preferences.get(PREFS.PAC_URL) + "/bugreport");
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
              console.log("bug report sent, status: " + xhr.status);
            }
          }
          xhr.send(JSON.stringify(data));

          tab.close();
        });
      }
    });
  }
};

exports.BugReporter = BugReporter;
