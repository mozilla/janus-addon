const self = require("sdk/self");
const { Cc, Ci, Cu, components } = require("chrome");
Cu.import("resource://gre/modules/Preferences.jsm");

const { PREFS } = require("prefs");
const { ByteTracker } = require("byteTracker");

var { ToggleButton } = require("sdk/ui/button/toggle");
var panels = require("sdk/panel");
var prefUtils = require("sdk/preferences/utils");
var tabs = require('sdk/tabs');

var gToggleButton, gPanel, gUpdateUsageTimer;

exports.onPrefChanged = function(name, value) {
  if (name === PREFS.ENABLED) {
    gToggleButton.icon = value ? "./janus-small.png" : "./janus-disabled-small.png";
    gPanel.port.emit("enabledChanged", value);
  }
};

gPanel = panels.Panel({
  width: 260,
  height: 165,
  contentURL: self.data.url("panel.html"),
  onHide: function() {
    gToggleButton.state('window', { checked: false });

    if (gUpdateUsageTimer) {
      gUpdateUsageTimer.cancel();
      gUpdateUsageTimer = null;
    }
  }
});

gPanel.port.on("enabledChanged", function(enabled) {
  Preferences.set(PREFS.ENABLED, enabled);
});

gPanel.port.on("reset", function() {
  ByteTracker.reset();
  gPanel.port.emit('usage', ByteTracker.getUsages());
});

gPanel.port.on("options", function() {
  gPanel.hide();

  prefUtils.open({ id: self.id }).then(function(result) {
    if (result.tabId) {
      for each (var tab in tabs) {
        if (tab.id === result.tabId) {
          tab.activate();
        }
      }
    }
  });
});

gUpdateUsageTimer = null;
var timerObserver = {
  notify: function() {
    gPanel.port.emit('usage', ByteTracker.getUsages());
  }
}

gToggleButton = ToggleButton({
  id: "janus-enable-button",
  label: "Janus",
  icon: "./janus-small.png",
  onChange: function(state) {
    if (state.checked) {
      gPanel.port.emit('usage', ByteTracker.getUsages());

      gPanel.show({
        position: gToggleButton
      });

      gUpdateUsageTimer = components.classes["@mozilla.org/timer;1"]
                        .createInstance(components.interfaces.nsITimer);
      gUpdateUsageTimer.initWithCallback(timerObserver, 1000, gUpdateUsageTimer.TYPE_REPEATING_SLACK);
    }
  }
});