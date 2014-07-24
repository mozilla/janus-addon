const self = require("sdk/self");
const { Cc, Ci, Cu, components } = require("chrome");

Cu.import("resource://gre/modules/Services.jsm");

const {TextEncoder, TextDecoder, OS} = Cu.import("resource://gre/modules/osfile.jsm", {});

const SAVE_TIMEOUT_MS = "10000";

// Ripped off from DownloadUtils.js
function convertByteUnits(aBytes) {
  let unitIndex = 0;
  let units = ["bytes", "kilobyte", "megabyte", "gigabyte"];

  // Convert to next unit if it needs 4 digits (after rounding), but only if
  // we know the name of the next unit
  while ((aBytes >= 999.5) && (unitIndex < units.length - 1)) {
    aBytes /= 1024;
    unitIndex++;
  }

  // Get rid of insignificant bits by truncating to 1 or 0 decimal points
  // 0 -> 0; 1.2 -> 1.2; 12.3 -> 12.3; 123.4 -> 123; 234.5 -> 235
  // added in bug 462064: (unitIndex != 0) makes sure that no decimal digit for bytes appears when aBytes < 100 
  aBytes = aBytes.toFixed((aBytes > 0) && (aBytes < 100) && (unitIndex != 0) ? 1 : 0);

  return aBytes + " " + units[unitIndex];
}

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

    this.timer = components.classes["@mozilla.org/timer;1"]
                        .createInstance(components.interfaces.nsITimer);
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
    let that = this;
    promise = promise.then(
      function onSuccess(array) {
        let obj = JSON.parse(decoder.decode(array));

        that.totalIngress += obj.totalIngress;
        that.totalEgress += obj.totalEgress;
        that.totalUnknown += obj.totalUnknown;
      }
    );
  },

  reset: function() {
    this.totalIngress = this.totalEgress = this.totalUnknown = 0;
  },

  getUsages: function() {
    return {
      totalIngress: convertByteUnits(this.totalIngress),
      totalEgress: convertByteUnits(this.totalEgress),
      totalUnknown: convertByteUnits(this.totalUnknown),
      reductionProxied: Math.round(((this.totalIngress - this.totalEgress) / (this.totalIngress || 1)) * 100) + "%",
      reductionOverall: Math.round((((this.totalIngress + this.totalUnknown) - (this.totalEgress + this.totalUnknown)) /
        ((this.totalIngress + this.totalUnknown) || 1)) * 100) + "%"
    };
  },

  observeActivity: function(channel, type, subtype, timestamp, extraSizeData, extraStringData) {
    if (type === this.distributor.ACTIVITY_TYPE_HTTP_TRANSACTION &&
        subtype === this.distributor.ACTIVITY_SUBTYPE_RESPONSE_COMPLETE) {
      try {
        var httpChannel = channel.QueryInterface(components.interfaces.nsIHttpChannel)
        this.totalIngress += parseInt(httpChannel.getResponseHeader('x-original-content-length'));
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

exports.ByteTracker = ByteTracker;
