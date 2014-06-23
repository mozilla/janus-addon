const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Preferences.jsm");

const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const ADDON_ID = "gonzales@mozilla.org";

const GONZALES_ENABLED_PREF = "extensions.gonzales.enabled";
const GONZALES_PAC_URL_PREF = "extensions.gonzales.pac_url";

const GONZALES_ADBLOCK_ENABLED_PREF = "extensions.gonzales.adblock.enabled";
const GONZALES_GIF2VIDEO_ENABLED_PREF = "extensions.gonzales.gif2video.enabled";

const PROXY_AUTOCONFIG_URL_PREF = "network.proxy.autoconfig_url";
const PROXY_TYPE_PREF = "network.proxy.type";

const DEFAULT_PROXY_URL = "http://gonzales.allizom.org";
const PROXY_TYPE = 2;

const GONZALES_MENU_ID = "tools-gonzales-toggle";

function isNativeUI() {
  return (Services.appinfo.ID == "{aa3c5121-dab2-40e2-81ca-7ea25febc110}");
}

var gAndroidMenuId = null;

function setGonzalesChecked(checked) {
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let win = windows.getNext();

    if (isNativeUI()) {
      win.NativeWindow.menu.update(gAndroidMenuId, {
        checked: checked
      });
    } else {
      let menuItem = win.document.getElementById(GONZALES_MENU_ID);

      console.log("setting menuitem checked: " + checked);
      menuItem.setAttribute("checked", checked);
    }
  }
}

var GonzalesAddon = {

  rebuildHeader: function() {
    this.header = "";

    if (Preferences.get(GONZALES_ADBLOCK_ENABLED_PREF, false)) {
      this.header += "+adblock ";
    }

    if (Preferences.get(GONZALES_GIF2VIDEO_ENABLED_PREF, false)) {
      this.header += "+gif2video ";
    }
  },

  applyPrefChanges: function(name) {
    var value = Preferences.get(name);

    if (name === GONZALES_ENABLED_PREF) {
      console.log("setting gonzales enabled: " + value);

      setGonzalesChecked(value);
      this.enabled = value;

      if (value) {
        Preferences.set(PROXY_AUTOCONFIG_URL_PREF, Preferences.get(GONZALES_PAC_URL_PREF));
        Preferences.set(PROXY_TYPE_PREF, PROXY_TYPE);
        Services.obs.addObserver(GonzalesAddon.observe, "http-on-modify-request", false);
      } else {
        Preferences.reset(PROXY_AUTOCONFIG_URL_PREF);
        Preferences.reset(PROXY_TYPE_PREF);

        try {
          Services.obs.removeObserver(GonzalesAddon.observe, "http-on-modify-request");
        } catch(e) {}
      }

      this.rebuildHeader();
    } else if (name === GONZALES_PAC_URL_PREF) {
      Preferences.set(PROXY_AUTOCONFIG_URL_PREF, value);
    } else if (name === GONZALES_ADBLOCK_ENABLED_PREF ||
               name === GONZALES_GIF2VIDEO_ENABLED_PREF) {
      this.rebuildHeader();
    }
  },

  observe: function(subject, topic, data) {
    console.log("topic: " + topic);
    if (topic === "nsPref:changed") {
      this.applyPrefChanges(data);
    } else if (topic === "http-on-modify-request") {
      let channel = subject.QueryInterface(Ci.nsIHttpChannel);

      console.log("X-Gonzales-Options: " + GonzalesAddon.header);
      channel.setRequestHeader("X-Gonzales-Options", GonzalesAddon.header, false);
    }
  },
}

var gWindows = [];

function onUseGonzalesClick() {
  console.log("toggling gonzales");
  var enabled = Preferences.get(GONZALES_ENABLED_PREF);
  enabled = !enabled;
  Preferences.set(GONZALES_ENABLED_PREF, enabled);
}

function loadIntoWindow(window) {
  if (!window)
    return;

  if (isNativeUI()) {
    gAndroidMenuId = window.NativeWindow.menu.add({
      name: 'Use Gonzales',
      checkable: true,
      checked: Preferences.get(GONZALES_ENABLED_PREF),
      parent: window.NativeWindow.menu.toolsMenuID,
      callback: onUseGonzalesClick
    });
  } else {
    let menuItem = window.document.createElementNS(NS_XUL, "menuitem");
    menuItem.setAttribute("id", GONZALES_MENU_ID);
    menuItem.setAttribute("label", "Use Gonzales");
    menuItem.setAttribute("checked", Preferences.get(GONZALES_ENABLED_PREF));
    menuItem.setAttribute("class", "menuitem-iconic");
    menuItem.addEventListener("command", onUseGonzalesClick);
    window.document.getElementById("menu_ToolsPopup").appendChild(menuItem);
  }

  gWindows.push(window);
}

function unloadFromWindow(window) {
  if (!window)
    return;

  if (isNativeUI()) {
    window.NativeWindow.menu.remove(gAndroidMenuId);
    gAndroidMenuId = null;
  } else {
    window.document.getElementById(GONZALES_MENU_ID).remove();
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

const OBSERVE_PREFS = [GONZALES_ENABLED_PREF, GONZALES_PAC_URL_PREF,
                       GONZALES_ADBLOCK_ENABLED_PREF, GONZALES_GIF2VIDEO_ENABLED_PREF];

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

  GonzalesAddon.applyPrefChanges(GONZALES_ENABLED_PREF);
}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN)
    return;

  OBSERVE_PREFS.forEach(function(pref) {
    Preferences.ignore(pref, GonzalesAddon);
  });

  // Put proxy prefs back to defaults
  Preferences.reset(PROXY_AUTOCONFIG_URL_PREF);
  Preferences.reset(PROXY_TYPE_PREF);

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
