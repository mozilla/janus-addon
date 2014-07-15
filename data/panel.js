
addon.port.on('usage', function(usage) {
  console.log("updating usages");
  document.getElementById('bytes-ingress').innerHTML = usage.totalIngress;
  document.getElementById('bytes-egress').innerHTML = usage.totalEgress;
  document.getElementById('bytes-unknown').innerHTML = usage.totalUnknown;
  document.getElementById('reduction-percentage').innerHTML = usage.reductionPercentage;
});

var enabledCheckbox = document.getElementById('enabled-checkbox');
addon.port.on('enabledChanged', function(enabled) {
  enabledCheckbox.checked = enabled;
});

enabledCheckbox.addEventListener("click", function() {
  console.log("sending enabledChanged");
  addon.port.emit("enabledChanged", enabledCheckbox.checked);
});

document.getElementById('reset-button').addEventListener('click', function() {
  addon.port.emit("reset");
});