const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Preferences.jsm");

const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const ADDON_ID = "janus@mozilla.org";

const JANUS_ENABLED_PREF = "extensions.janus.enabled";
const JANUS_PAC_URL_PREF = "extensions.janus.pac_url";

const JANUS_ADBLOCK_ENABLED_PREF = "extensions.janus.adblock.enabled";
const JANUS_GIF2VIDEO_ENABLED_PREF = "extensions.janus.gif2video.enabled";

const PROXY_AUTOCONFIG_URL_PREF = "network.proxy.autoconfig_url";
const PROXY_TYPE_PREF = "network.proxy.type";

const DEFAULT_PROXY_URL = "http://janus.allizom.org";
const PROXY_TYPE = 2;

const JANUS_MENU_ID = "tools-janus-toggle";

function isNativeUI() {
  return (Services.appinfo.ID == "{aa3c5121-dab2-40e2-81ca-7ea25febc110}");
}

var gAndroidMenuId = null;

function setProxyChecked(checked) {
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let win = windows.getNext();

    if (isNativeUI()) {
      win.NativeWindow.menu.update(gAndroidMenuId, {
        checked: checked
      });
    } else {
      let menuItem = win.document.getElementById(JANUS_MENU_ID);
      menuItem.setAttribute("checked", checked);
    }
  }
}

var ProxyAddon = {

  rebuildHeader: function() {
    this.header = "";

    if (Preferences.get(JANUS_ADBLOCK_ENABLED_PREF, false)) {
      this.header += "+adblock ";
    }

    if (Preferences.get(JANUS_GIF2VIDEO_ENABLED_PREF, false)) {
      this.header += "+gif2video ";
    }
  },

  applyPrefChanges: function(name) {
    var value = Preferences.get(name);

    if (name === JANUS_ENABLED_PREF) {

      setProxyChecked(value);
      this.enabled = value;

      if (value) {
        Preferences.set(PROXY_AUTOCONFIG_URL_PREF, Preferences.get(JANUS_PAC_URL_PREF));
        Preferences.set(PROXY_TYPE_PREF, PROXY_TYPE);
        Services.obs.addObserver(ProxyAddon.observe, "http-on-modify-request", false);
      } else {
        Preferences.reset(PROXY_AUTOCONFIG_URL_PREF);
        Preferences.reset(PROXY_TYPE_PREF);

        try {
          Services.obs.removeObserver(ProxyAddon.observe, "http-on-modify-request");
        } catch(e) {}
      }

      this.rebuildHeader();
    } else if (name === JANUS_PAC_URL_PREF) {
      Preferences.set(PROXY_AUTOCONFIG_URL_PREF, value);
    } else if (name === JANUS_ADBLOCK_ENABLED_PREF ||
               name === JANUS_GIF2VIDEO_ENABLED_PREF) {
      this.rebuildHeader();
    }
  },

  observe: function(subject, topic, data) {
    if (topic === "nsPref:changed") {
      this.applyPrefChanges(data);
    } else if (topic === "http-on-modify-request") {
      let channel = subject.QueryInterface(Ci.nsIHttpChannel);

      channel.setRequestHeader("X-Janus-Options", ProxyAddon.header, false);
    }
  },
}

var gWindows = [];

function onUseProxyClick() {
  var enabled = Preferences.get(JANUS_ENABLED_PREF);
  enabled = !enabled;
  Preferences.set(JANUS_ENABLED_PREF, enabled);
}

function loadIntoWindow(window) {
  if (!window)
    return;

  if (isNativeUI()) {
    gAndroidMenuId = window.NativeWindow.menu.add({
      name: 'Use Proxy',
      checkable: true,
      checked: Preferences.get(JANUS_ENABLED_PREF),
      parent: window.NativeWindow.menu.toolsMenuID,
      callback: onUseProxyClick
    });
  } else {
    let menuItem = window.document.createElementNS(NS_XUL, "menuitem");
    menuItem.setAttribute("id", JANUS_MENU_ID);
    menuItem.setAttribute("label", "Use Proxy");
    menuItem.setAttribute("checked", Preferences.get(JANUS_ENABLED_PREF));
    menuItem.setAttribute("class", "menuitem-iconic");
    menuItem.addEventListener("command", onUseProxyClick);
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
    window.document.getElementById(JANUS_MENU_ID).remove();
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

const OBSERVE_PREFS = [JANUS_ENABLED_PREF, JANUS_PAC_URL_PREF,
                       JANUS_ADBLOCK_ENABLED_PREF, JANUS_GIF2VIDEO_ENABLED_PREF];

function startup(aData, aReason) {

  if (aReason === ADDON_INSTALL) {
    Preferences.set(JANUS_ENABLED_PREF, false);
    Preferences.set(JANUS_PAC_URL_PREF, DEFAULT_PROXY_URL);
  }

  OBSERVE_PREFS.forEach(function(pref) {
    Preferences.observe(pref, ProxyAddon);
  });

  // Load into any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }

  // Load into any new windows
  Services.wm.addListener(windowListener);

  ProxyAddon.applyPrefChanges(JANUS_ENABLED_PREF);
}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN)
    return;

  OBSERVE_PREFS.forEach(function(pref) {
    Preferences.ignore(pref, ProxyAddon);
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
