const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Prompt.jsm");

const ADDON_ID = "gonzales@mozilla.org";

function setEnabled(enabled) {
  console.log("SNORP: setting gonzales enabled: " + enabled);
  // Set prefs
}

function showEnablePrompt() {
  // let p = new Prompt({
  //   title: "Enable Gonzales?",
  //   message: "Do you want to enable the Gonzales proxy server?",
  //   buttons: ["Yup", "Nope"]
  // }).show(function (data) {
  //   setEnabled(data.button == 0);
  // });
}

function observe(doc, topic, id) {
  if (id != ADDON_ID) {
    return;
  }

  doc.getElementById('enable-setting').addEventListener('preferencechanged', function() {
    console.log("SNORP: pref changed!");
  });
}

function startup(aData, aReason) {
  switch(aReason) {
    case ADDON_INSTALL:
    case ADDON_ENABLE:
      showEnablePrompt();
      break;
  }

  Services.obs.addObserver(observe, AddonManager.OPTIONS_NOTIFICATION_DISPLAYED, false);
}

function shutdown(aData, aReason) {
  Services.obs.removeObserver(observe, AddonManager.OPTIONS_NOTIFICATION_DISPLAYED);
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
