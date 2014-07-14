const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Preferences.jsm");

const {TextEncoder, TextDecoder, OS} = Cu.import("resource://gre/modules/osfile.jsm", {});

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

const JANUS_ICON_ENABLED = "data:image/png;base64,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";
const JANUS_ICON_DISABLED = "data:image/png;base64,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";

const SAVE_TIMEOUT_MS = "10000";

function isNativeUI() {
  return (Services.appinfo.ID == "{aa3c5121-dab2-40e2-81ca-7ea25febc110}");
}

var gAndroidPageAction = null;

function bytesToSize(size) {
    if (size == 0) {
      return "0 B";
    }

    var i = Math.floor( Math.log(size) / Math.log(1024) );
    return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
};

var ByteTracker = {
  init: function() {
    this.totalIngress = 0;
    this.totalEgress = 0;
    this.totalUnknown = 0;
    this.listening = false;

    this.loadAsync();

    this.distributor = Cc['@mozilla.org/network/http-activity-distributor;1']
      .getService(Ci.nsIHttpActivityDistributor);
  },

  start: function() {
    if (this.listening) {
      return;
    }

    this.distributor.addObserver(this);
    this.listening = true;

    this.timer = Components.classes["@mozilla.org/timer;1"]
                        .createInstance(Components.interfaces.nsITimer);
    this.timer.initWithCallback(this, SAVE_TIMEOUT_MS, this.timer.TYPE_REPEATING_SLACK);
  },

  stop: function() {
    if (!this.listening) {
      return;
    }

    this.saveAsync();
    this.timer.cancel();
    this.timer = null;

    try {
      this.distributor.removeObserver(this);
      this.listening = false;
    } catch(e) {}
  },

  notify: function(timer) {
    this.saveAsync();
  },

  getStorageFile: function() {
    return OS.Path.join(OS.Constants.Path.profileDir, "janus_addon_bytetracker.json");
  },

  saveAsync: function() {
    let obj = {
      totalIngress: this.totalIngress,
      totalEgress: this.totalEgress,
      totalUnknown: this.totalUnknown
    };

    let encoder = new TextEncoder();
    OS.File.writeAtomic(this.getStorageFile(), encoder.encode(JSON.stringify(obj)));
  },

  loadAsync: function() {
    let decoder = new TextDecoder();
    let promise = OS.File.read(this.getStorageFile());
    let self = this;
    promise = promise.then(
      function onSuccess(array) {
        let obj = JSON.parse(decoder.decode(array));

        self.totalIngress += obj.totalIngress;
        self.totalEgress += obj.totalEgress;
        self.totalUnknown += obj.totalUnknown;
      }
    );
  },

  reset: function() {
    this.totalIngress = this.totalEgress = this.totalUnknown = 0;
  },

  getUsages: function() {
    if (this.totalIngress === 0 || this.totalEgress === 0) {
      return { totalIngress: 0, totalEgress: 0, totalUnknown: 0, reductionPercentage: 0 };
    }

    return {
      totalIngress: this.totalIngress,
      totalEgress: this.totalEgress,
      totalUnknown: this.totalUnknown,
      reductionPercentage: Math.round((((this.totalIngress + this.totalUnknown) - (this.totalEgress + this.totalUnknown)) /
        ((this.totalIngress + this.totalUnknown) || 1)) * 100)
    };
  },

  observeActivity: function(channel, type, subtype, timestamp, extraSizeData, extraStringData) {
    if (type === this.distributor.ACTIVITY_TYPE_HTTP_TRANSACTION &&
        subtype === this.distributor.ACTIVITY_SUBTYPE_RESPONSE_COMPLETE) {

      try {
        this.totalIngress += parseInt(channel.getResponseHeader('x-original-content-length'));
        this.totalEgress += extraSizeData;
      } catch(e) {
        // No x-original-content-length header for whatever reason, so
        // we don't know the original size. Count it as equal on both
        // sides, but keep track of how much of that stuff we get.
        this.totalUnknown += extraSizeData;
      }
    }
  }
};

ByteTracker.init();

var ProxyAddon = {

  rebuildHeader: function() {
    this.header = "";

    var features = [
      { pref: JANUS_ADBLOCK_ENABLED_PREF, option: 'adblock' },
      { pref: JANUS_GIF2VIDEO_ENABLED_PREF, option: 'gif2video' }
    ];

    features.forEach((feature) => {
      this.header += (Preferences.get(feature.pref, false) ? "+" +
        feature.option : "-" + feature.option) + " ";
    });
  },

  applyPrefChanges: function(name) {
    var value = Preferences.get(name);

    if (name === JANUS_ENABLED_PREF) {

      updateUI(value);
      this.enabled = value;

      if (value) {
        Preferences.set(PROXY_AUTOCONFIG_URL_PREF, Preferences.get(JANUS_PAC_URL_PREF));
        Preferences.set(PROXY_TYPE_PREF, PROXY_TYPE);
        Services.obs.addObserver(ProxyAddon.observe, "http-on-modify-request", false);
        ByteTracker.start();
      } else {
        Preferences.reset(PROXY_AUTOCONFIG_URL_PREF);
        Preferences.reset(PROXY_TYPE_PREF);
        ByteTracker.stop();
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

  observeAddon: function(doc, topic, id) {
    if (id != ADDON_ID) {
      return;
    }

    function updateUsage() {
      let bytesLabel = doc.getElementById("bytes-label");
      let reductionLabel = doc.getElementById("reduction-label");
      let usage = ByteTracker.getUsages();

      bytesLabel.innerHTML = bytesToSize(usage.totalEgress) + " / " +
        bytesToSize(usage.totalIngress) + " (" + bytesToSize(usage.totalUnknown) +
        " unknown)";

      reductionLabel.innerHTML = "reduced by " + usage.reductionPercentage + "%";
    }

    let resetButton = doc.getElementById("reset-button");
    resetButton.innerHTML = "Reset";
    resetButton.addEventListener('click', function() {
      ByteTracker.reset();
      updateUsage();
    });

    updateUsage();
  },
}

var gWindows = [];

function onUseProxyClick() {
  var enabled = Preferences.get(JANUS_ENABLED_PREF);
  enabled = !enabled;
  Preferences.set(JANUS_ENABLED_PREF, enabled);
}

function onLongClick() {
  let usage = ByteTracker.getUsages();

  if (usage.totalEgress == 0 || usage.totalIngress == 0) {
    toast("No data", "short");
  } else {
    toast(bytesToSize(usage.totalEgress) + " / " +
      bytesToSize(usage.totalIngress) + " (" + bytesToSize(usage.totalUnknown) +
      " unknown)\nreduced by " + usage.reductionPercentage + "%",
      "long");
  }
}

function toast(message, duration, options) {
  if (!isNativeUI())
    return;

  gWindows.forEach(function(window) {
    window.NativeWindow.toast.show(message, duration, options);
  });
}

function updateUIForWindow(window, enabled) {
  if (isNativeUI()) {
    var needToast = !!gAndroidPageAction;
    if (gAndroidPageAction) {
      window.NativeWindow.pageactions.remove(gAndroidPageAction);
      gAndroidPageAction = null;
    }

    gAndroidPageAction = window.NativeWindow.pageactions.add({
      title: getIconTitle(enabled),
      icon: getIcon(enabled),
      clickCallback: onUseProxyClick,
      longClickCallback: onLongClick,
    });

    if (needToast) {
      if (enabled) {
        toast("Proxy Enabled", "short");
      } else {
        toast("Proxy Disabled", "short");
      }
    }
  } else {
    let menuItem = window.document.getElementById(JANUS_MENU_ID);
    if (menuItem) {
      menuItem.setAttribute("checked", enabled);
    } else {
      menuItem = window.document.createElementNS(NS_XUL, "menuitem");
      menuItem.setAttribute("id", JANUS_MENU_ID);
      menuItem.setAttribute("label", "Use Proxy");
      menuItem.setAttribute("checked", enabled);
      menuItem.setAttribute("class", "menuitem-iconic");
      menuItem.addEventListener("command", onUseProxyClick);
      window.document.getElementById("menu_ToolsPopup").appendChild(menuItem);
    }
  }
}

function updateUI(enabled) {
  gWindows.forEach(function(window) {
    updateUIForWindow(window, enabled);
  });
}

function getIcon() {
  return Preferences.get(JANUS_ENABLED_PREF) ? JANUS_ICON_ENABLED : JANUS_ICON_DISABLED;
}

function getIconTitle() {
  return Preferences.get(JANUS_ENABLED_PREF) ? "Disable Proxy" : "Enable Proxy";
}

function loadIntoWindow(window) {
  if (!window)
    return;

  updateUIForWindow(window, Preferences.get(JANUS_ENABLED_PREF));
  gWindows.push(window);
}

function unloadFromWindow(window) {
  if (!window)
    return;

  if (isNativeUI()) {
    window.NativeWindow.pageactions.remove(gAndroidPageAction);
    gAndroidPageAction = null;
  } else {
    window.document.getElementById(JANUS_MENU_ID).remove();
  }

  var windowIndex = gWindows.indexOf(window);
  if (windowIndex >= 0) {
    gWindows.splice(windowIndex, 1);
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
    Preferences.set(JANUS_ENABLED_PREF, true);
    Preferences.set(JANUS_PAC_URL_PREF, DEFAULT_PROXY_URL);
  }

  OBSERVE_PREFS.forEach(function(pref) {
    Preferences.observe(pref, ProxyAddon);
  });

  Services.obs.addObserver(ProxyAddon.observeAddon, AddonManager.OPTIONS_NOTIFICATION_DISPLAYED, false);

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

  Services.obs.removeObserver(ProxyAddon.observeAddon, AddonManager.OPTIONS_NOTIFICATION_DISPLAYED);

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
