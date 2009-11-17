var SpamnessOptions = {};

SpamnessOptions.onLoad = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    if (prefs.getBoolPref("browser.preferences.instantApply")) {
        document.getElementById('headerNameForm').addEventListener('blur', SpamnessOptions.syncHeaderPrefs, true);
    }
    document.getElementById("headerNameForm").value = prefs.getCharPref("extensions.spamness.header");
};

SpamnessOptions.syncHeaderPrefs = function(evt) {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    if (prefs.getBoolPref("browser.preferences.instantApply")) {
	return true;
    }
    return Spamness.syncHeaderPrefs(null);
};

SpamnessOptions.onUnload = function() {
    window.removeEventListener('load', SpamnessOptions.onLoad, false);
    window.removeEventListener('unload', SpamnessOptions.onUnload, false);
};

window.addEventListener('load', SpamnessOptions.onLoad, false);
window.addEventListener('unload', SpamnessOptions.onUnload, false);
