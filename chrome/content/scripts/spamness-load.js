/* global RspamdSpamness:false */

"use strict";

const prefObserver = {
    observe: function (aSubject, aTopic, aData) {
        if (aTopic !== "nsPref:changed") {
            return;
        }
        if (aData === "trainingButtonHam.defaultAction" ||
            aData === "trainingButtonSpam.defaultAction"
        ) {
            RspamdSpamness.setBtnCmdLabels();
        }
        if (aData === "trainingButtons.enabled") {
            RspamdSpamness.hideTrnButtons();
        }
    },
    register: function () {
        this.branch = Services.prefs.getBranch("extensions.rspamd-spamness.");

        // This is only necessary prior to Gecko 13
        if (!("addObserver" in this.branch)) {
            this.branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
        }

        this.branch.addObserver("", this, false);
    },
    unregister: function () {
        this.branch.removeObserver("", this);
    }
};

const toolbarObserver = {
    observe: function () {
        document.getElementById("header-view-toolbar")
            .addEventListener("drop", this.setBtnCmdLabels, false);
    },
    setBtnCmdLabels: function () {
        RspamdSpamness.setBtnCmdLabels();
    }
};

RspamdSpamness.onLoad = function () {
    const {prefs} = Services;

    // Convert legacy preference
    if (prefs.getPrefType("extensions.rspamd-spamness.trainingButtons.defaultAction")) {
        if (prefs.getCharPref("extensions.rspamd-spamness.trainingButtons.defaultAction") === "copy") {
            prefs.setCharPref("extensions.rspamd-spamness.trainingButtonHam.defaultAction", "copy");
            prefs.setCharPref("extensions.rspamd-spamness.trainingButtonSpam.defaultAction", "copy");
        }
        prefs.clearUserPref("extensions.rspamd-spamness.trainingButtons.defaultAction");
    }

    RspamdSpamness.syncHeaderPrefs(prefs.getCharPref("extensions.rspamd-spamness.header"));
    RspamdSpamness.setBtnCmdLabels();
    RspamdSpamness.hideTrnButtons();
    RspamdSpamness.Message.changeSymOrder();
    RspamdSpamness.Message.toggleSymGrouping();

    // whether this column gets default status
    const defaultCol = prefs.getBoolPref("extensions.rspamd-spamness.isDefaultColumn");
    if (defaultCol) {
        RspamdSpamness.addSpamnessColumn();
    }

    // first time info, should only ever show once
    const greet = prefs.getBoolPref("extensions.rspamd-spamness.installationGreeting");
    if (greet) {
        RspamdSpamness.greet();
        prefs.setBoolPref("extensions.rspamd-spamness.installationGreeting", false);
        prefs.savePrefFile(null);
    }

    prefObserver.register();
    Services.obs.addObserver(toolbarObserver, "mail:updateToolbarItems", false);

    window.matchMedia("(prefers-color-scheme: dark)").addListener(RspamdSpamness.setTheme);
};

RspamdSpamness.onUnload = function () {
    Services.obs.removeObserver(optionObserver, "addon-options-displayed", false);
    window.removeEventListener("load", RspamdSpamness.onLoad, false);
    window.removeEventListener("unload", RspamdSpamness.onUnload, false);
};

window.addEventListener("load", RspamdSpamness.onLoad, false);
window.addEventListener("unload", RspamdSpamness.onUnload, false);
