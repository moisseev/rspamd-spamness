var SpamnessOptions = {};

SpamnessOptions.onLoad = function() {
    SpamnessOptions.updateShowRules();
};

SpamnessOptions.onUnload = function() {
    window.removeEventListener('load', SpamnessOptions.onLoad, false);
    window.removeEventListener('unload', SpamnessOptions.onUnload, false);
};

SpamnessOptions.updateShowRules = function() {
    var disable = !document.getElementById('displayMessageRulesCompactControl').checked;
    document.getElementById('displayMessageRulesExtendedControl').disabled = disable;
};

window.addEventListener('load', SpamnessOptions.onLoad, false);
window.addEventListener('unload', SpamnessOptions.onUnload, false);
