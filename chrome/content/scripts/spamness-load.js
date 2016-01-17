const myAddonId = 'rspamd-spamness@alexander.moisseev'

var optionObserver = {
    observe(aSubject, aTopic, aData) {
        if (aTopic !== 'addon-options-displayed' || aData !== myAddonId)
            return;
        var doc = aSubject;
        var elem = doc.getElementById("advanced-options-button");
        elem.addEventListener('command', this.eventHandler, true);
    },
    eventHandler(event) {
        var previousSpamnessHeader = prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();
        window.openDialog(
            "chrome://rspamd-spamness/content/advancedOptions.xul", "",
            "chrome,modal,dialog,centerscreen",
            previousSpamnessHeader
        );
    }
};

RspamdSpamness.onLoad = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

    RspamdSpamness.previousSpamnessHeader = prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();

    // colon separator
    var chdrs = prefs.getCharPref("mailnews.customHeaders");
    chdrs = chdrs.replace(/\s+/g, '');
    RspamdSpamness.customHeaders = (chdrs == "") ? new Array() : chdrs.split(":");

    // space separator
    var dhdrs = prefs.getCharPref("mailnews.customDBHeaders");
    dhdrs = dhdrs.replace(/\s+/g, ' ');
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
    
    Services.obs.addObserver(optionObserver, "addon-options-displayed", false);
};

RspamdSpamness.onUnload = function() {
    Services.obs.removeObserver(optionObserver, "addon-options-displayed", false);
    window.removeEventListener('load', RspamdSpamness.onLoad, false);
    window.removeEventListener('unload', RspamdSpamness.onUnload, false);
};

window.addEventListener("load", RspamdSpamness.onLoad, false);
window.addEventListener("unload", RspamdSpamness.onUnload, false);
