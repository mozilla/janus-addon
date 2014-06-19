const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
//Cu.import("resource://gre/modules/Prompt.jsm");
Cu.import("resource://gre/modules/Preferences.jsm");

const ADDON_ID = "gonzales@mozilla.org";

const GONZALES_ENABLED_PREF = "extensions.gonzales.enabled";
const GONZALES_PAC_URL_PREF = "extensions.gonzales.pac_url";

const PROXY_AUTOCONFIG_URL_PREF = "network.proxy.autoconfig_url";
const PROXY_TYPE_PREF = "network.proxy.type";

const DEFAULT_PROXY_URL = "http://gonzales.allizom.org";
const PROXY_TYPE = 2;

function isNativeUI() {
  return (Services.appinfo.ID == "{aa3c5121-dab2-40e2-81ca-7ea25febc110}");
}

var gMenuId = null;

function setGonzalesChecked(checked) {
  if (!isNativeUI())
    return;

  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    windows.getNext().NativeWindow.menu.update(gMenuId, {
      checked: checked
    });
  }
}

var GonzalesAddon = {

  applyPrefChanges: function(name) {
    var value = Preferences.get(name);

    if (name === GONZALES_ENABLED_PREF) {
      console.log("setting gonzales enabled: " + value);

      setGonzalesChecked(value);

      if (value) {
        Preferences.set(PROXY_AUTOCONFIG_URL_PREF, Preferences.get(GONZALES_PAC_URL_PREF));
        Preferences.set(PROXY_TYPE_PREF, PROXY_TYPE);
      } else {
        Preferences.reset(PROXY_AUTOCONFIG_URL_PREF);
        Preferences.reset(PROXY_TYPE_PREF);
      }
    } else if (name === GONZALES_PAC_URL_PREF) {
      Preferences.set(PROXY_AUTOCONFIG_URL_PREF, value);
    }
  },

  observe: function(subject, topic, name) {
    this.applyPrefChanges(name);
  }
}

var gWindows = [];

function onUseGonzalesClick() {
  var enabled = Preferences.get(GONZALES_ENABLED_PREF);
  enabled = !enabled;
  Preferences.set(GONZALES_ENABLED_PREF, enabled);
}

function loadIntoWindow(window) {
  if (!window)
    return;

  if (isNativeUI()) {
    gMenuId = window.NativeWindow.menu.add({
      name: 'Use Gonzales',
      checkable: true,
      checked: Preferences.get(GONZALES_ENABLED_PREF),
      parent: window.NativeWindow.menu.toolsMenuID,
      callback: onUseGonzalesClick
    });

    gWindows.push(window);
  }
}

function unloadFromWindow(window) {
  if (!window)
    return;

  if (isNativeUI()) {
    window.NativeWindow.menu.remove(gMenuId);
    gMenuId = null;
  }
}


/**
* bootstrap.js API
*/
var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      loadIntoWindow(domWindow);
    }, false);
  },
  
  onCloseWindow: function(aWindow) {
  },
  
  onWindowTitleChange: function(aWindow, aTitle) {
  }
};

function showEnablePrompt() {
  // let p = new Prompt({
  //   title: "Enable Gonzales?",
  //   message: "Do you want to enable the Gonzales proxy server?",
  //   buttons: ["Yup", "Nope"]
  // }).show(function (data) {
  //   setEnabled(data.button == 0);
  // });
}

// function observe(doc, topic, id) {
//   if (id != ADDON_ID) {
//     return;
//   }

//   doc.getElementById('enable-setting').addEventListener('preferencechanged', function() {
//     console.log("SNORP: pref changed!");
//   });
// }

const OBSERVE_PREFS = [GONZALES_ENABLED_PREF, GONZALES_PAC_URL_PREF];

function startup(aData, aReason) {

  if (aReason === ADDON_INSTALL) {
    Preferences.set(GONZALES_ENABLED_PREF, false);
    Preferences.set(GONZALES_PAC_URL_PREF, DEFAULT_PROXY_URL);
  }

  OBSERVE_PREFS.forEach(function(pref) {
    Preferences.observe(pref, GonzalesAddon);
  });

  // Load into any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }

  // Load into any new windows
  Services.wm.addListener(windowListener);

  console.log("SNORP: startup done");
}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN)
    return;

  OBSERVE_PREFS.forEach(function(pref) {
    Preferences.ignore(pref, GonzalesAddon);
  });

  Preferences.set(GONZALES_ENABLED_PREF, false);
  GonzalesAddon.applyPrefChanges(GONZALES_ENABLED_PREF);

  // Stop listening for new windows
  Services.wm.removeListener(windowListener);

  // Unload from any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
