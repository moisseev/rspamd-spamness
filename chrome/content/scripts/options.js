var SpamnessOptions = {};

SpamnessOptions.onLoad = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    if (prefs.getBoolPref("browser.preferences.instantApply")) {
        document.getElementById('headerNameForm').addEventListener('blur', SpamnessOptions.syncHeaderPrefs, true);
    }
    document.getElementById("headerNameForm").value = prefs.getCharPref("extensions.spamness.header");
    SpamnessOptions.dependents("displayMessageRulesControl");
};

SpamnessOptions.syncHeaderPrefs = function(evt) {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    return Spamness.syncHeaderPrefs(null);
};

SpamnessOptions.dependents = function(id) {
    var el = document.getElementById(id);
    switch(id) {
        case "displayMessageRulesControl":
            document.getElementById('openRuleLinkLocallyControl').setAttribute("disabled", !el.getAttribute("checked"));
            break;
        default:
            break;
    }
}

SpamnessOptions.onUnload = function() {
    window.removeEventListener('load', SpamnessOptions.onLoad, false);
    window.removeEventListener('unload', SpamnessOptions.onUnload, false);
};

window.addEventListener('load', SpamnessOptions.onLoad, false);
window.addEventListener('unload', SpamnessOptions.onUnload, false);
