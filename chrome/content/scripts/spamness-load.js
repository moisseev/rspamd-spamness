RspamdSpamness.onLoad = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

    RspamdSpamness.previousSpamnessHeader = prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();

    // colon separator
    var chdrs = prefs.getCharPref("mailnews.customHeaders");
    chdrs = chdrs.replace(/\s+/g, '');
    RspamdSpamness.customHeaders = (chdrs == "") ? new Array() : chdrs.split(":");

    // space separator
    var dhdrs = prefs.getCharPref("mailnews.customDBHeaders");
    chdrs = chdrs.replace(/\s+/g, ' ');
    RspamdSpamness.customDBHeaders = (dhdrs == "") ? new Array() : dhdrs.split(" ");

    RspamdSpamness.syncHeaderPrefs(RspamdSpamness.previousSpamnessHeader);

    // whether this column gets default status
    var defaultCol = prefs.getBoolPref("extensions.rspamd-spamness.isDefaultColumn");
    if (defaultCol) {
        RspamdSpamness.addSpamnessColumn();
    }
    
    // first time info, should only ever show once
    var greet = prefs.getBoolPref("extensions.rspamd-spamness.installationGreeting");
    if (greet) {
        RspamdSpamness.greet();
        prefs.setBoolPref("extensions.rspamd-spamness.installationGreeting", false);
        prefs.savePrefFile(null);
    }
};

RspamdSpamness.onUnload = function() {
    window.removeEventListener('load', RspamdSpamness.onLoad, false);
    window.removeEventListener('unload', RspamdSpamness.onUnload, false);
};

window.addEventListener("load", RspamdSpamness.onLoad, false);
window.addEventListener("unload", RspamdSpamness.onUnload, false);
