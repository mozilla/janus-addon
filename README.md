# Janus Addon

This addon is deprecated.

## Compilation instructions

First get the old version of the addon SDK:

```
git clone https://github.com/mozilla/addon-sdk.git
cd addon-sdk
git checkout -b cfx 0ecebf288b09343f7fb8012c11c87f4d0706b1e5
```

Next compile the Janus addon:

```
source /path/to/addon-sdk/bin/activate
cd /path/to/janus-addon
./build
```

Ignore the "device not found" error which comes from adb (Android tool).

Finally install the addon:

```
firefox janus.xpi
```
