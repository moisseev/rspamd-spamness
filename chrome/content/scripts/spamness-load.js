const myAddonId = 'rspamd-spamness@alexander.moisseev'

var optionObserver = {
    observe: function(aSubject, aTopic, aData) {
        if (aTopic !== 'addon-options-displayed' || aData !== myAddonId)
            return;
        var doc = aSubject;
        var elem = doc.getElementById("advanced-options-button");
        elem.addEventListener('command', this.eventHandler, false);
    },
    eventHandler: function(event) {
        var previousSpamnessHeader = Services.prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();
        window.openDialog(
            "chrome://rspamd-spamness/content/advancedOptions.xul", "",
            "chrome,modal,dialog,centerscreen",
            previousSpamnessHeader
        );
    }
};

RspamdSpamness.onLoad = function() {
    const prefs = Services.prefs;

    RspamdSpamness.previousSpamnessHeader = prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();
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
