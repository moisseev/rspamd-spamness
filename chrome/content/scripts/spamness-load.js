Spamness.onLoad = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

    Spamness.previousSpamnessHeader = Spamness.getHeaderName(prefs);

    // colon separator
    var chdrs = prefs.getCharPref("mailnews.customHeaders");
    chdrs = chdrs.replace(/\s+/g, '');
    Spamness.customHeaders = (chdrs == "") ? new Array() : chdrs.split(":");

    // space separator
    var dhdrs = prefs.getCharPref("mailnews.customDBHeaders");
    chdrs = chdrs.replace(/\s+/g, ' ');
    Spamness.customDBHeaders = (dhdrs == "") ? new Array() : dhdrs.split(" ");

    Spamness.syncHeaderPrefs(Spamness.previousSpamnessHeader);

    var greet = prefs.getBoolPref("extensions.spamness.installationGreeting");
    if (greet) {
        Spamness.greet();
        //prefs.setBoolPref("extensions.spamness.installationGreeting", false);
    }
};

Spamness.onUnload = function() {
    window.removeEventListener('load', Spamness.onLoad, false);
    window.removeEventListener('unload', Spamness.onUnload, false);
};

window.addEventListener("load", Spamness.onLoad, false);
window.addEventListener("unload", Spamness.onUnload, false);
