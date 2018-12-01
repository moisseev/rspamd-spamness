"use strict";

// eslint-disable-next-line no-var
var RspamdSpamness = {
    customDBHeaders:                 [],
    customHeaders:                   [],
    previousSpamnessHeader:          "",
    trainingButtonHamDefaultAction:  "move",
    trainingButtonSpamDefaultAction: "move"
};

Components.utils.import("resource://gre/modules/AddonManager.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

RspamdSpamness.getImageSrc = function (normalized) {
    let img = null;
    let level = null;
    if (isNaN(normalized)) {
        img = "chrome://messenger/skin/icons/symbol-null.png";
    } else if (normalized < 0) {
        level = Math.round(Math.log(Math.abs(normalized) + 1));
        level = (level >= 5) ? 4 : level;
        img = "chrome://rspamd-spamness/skin/ham" + level + ".png";
    } else {
        level = Math.round(Math.log(normalized + 1));
        level = (level >= 5) ? 4 : level;
        img = "chrome://rspamd-spamness/skin/spam" + level + ".png";
    }
    return img;
};

RspamdSpamness.getMetricClass = function (rule) {
    if (rule.match(/^GREYLIST\(/))
        return "linkDisplayButtonGreyl";

    const metric = rule.match(/\(([-\d.]+)\)$/);
    const metricScore = (metric)
        ? metric[1]
        : null;
    if (metricScore < 0) {
        return "linkDisplayButtonHam";
    } else if (metricScore > 0) {
        return "linkDisplayButtonSpam";
    }
    return null;
};

RspamdSpamness.getHeaderStr = function (hdr) {
    const header = Services.prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();
    const headerStr = hdr.getStringProperty(header);
    return (headerStr) ? headerStr : null;
};

RspamdSpamness.getScoreByHdr = function (hdr) {
    const re = /(?:^|: \S+ \[)([-\d.]+?) [(/]/;
    const headerStr = RspamdSpamness.getHeaderStr(hdr) || hdr.getStringProperty("x-spam-score");
    return (headerStr)
        ? parseFloat(re.exec(headerStr)[1])
        : Number.NaN;
};

// eslint-disable-next-line max-lines-per-function
RspamdSpamness.syncHeaderPrefs = function (prefValue) {
    let prefVal = prefValue;
    if (!prefVal) {
        prefVal = document.getElementById("headerNameForm").value;
    }
    const prefEl = document.getElementById("headerNameForm");
    const {prefs} = Services;
    RspamdSpamness.previousSpamnessHeader = prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();

    RspamdSpamness.customDBHeaders = getHeadersPref("mailnews.customDBHeaders", /\s+/);
    RspamdSpamness.customHeaders = getHeadersPref("mailnews.customHeaders", /\s*:\s*/);

    if (prefVal !== RspamdSpamness.previousSpamnessHeader) {
        if (!isRFC5322HeaderName(prefVal)) {
            showAlert("colonInHeaderName");
            return false;
        }

        const {nsMsgSearchAttrib} = Components.interfaces;
        if (RspamdSpamness.customHeaders.length + 1 >=
                (nsMsgSearchAttrib.kNumMsgSearchAttributes - nsMsgSearchAttrib.OtherHeader - 1)) {
            showAlert("customHeaderOverflow");
            return false;
        }
    }

    setHeadersPref(
        "mailnews.customDBHeaders", RspamdSpamness.customDBHeaders, " ",
        RspamdSpamness.previousSpamnessHeader, prefVal
    );
    setHeadersPref(
        "mailnews.customHeaders", RspamdSpamness.customHeaders, ": ",
        RspamdSpamness.previousSpamnessHeader, [prefVal, "x-spam-score"]
    );

    prefs.setCharPref("extensions.rspamd-spamness.header", prefVal);
    RspamdSpamness.previousSpamnessHeader = prefVal;

    // flush to disk
    prefs.savePrefFile(null);
    return true;

    function getHeadersPref(prefName, separator) {
        const chdrs = prefs.getCharPref(prefName).trim();
        return (chdrs === "")
            ? []
            : chdrs.split(separator);
    }

    function isRFC5322HeaderName(str) {
        return (/^[\x21-\x39\x3B-\x7E]+$/).test(str);
    }

    function setHeadersPref(prefName, arr, separator, rmvHeaders, addHeaders) {
        const h = {
            add: addHeaders,
            rmv: rmvHeaders
        };
        let modified = null;
        if (typeof h.rmv === "string")
            h.rmv = [h.rmv];
        if (typeof h.add === "string")
            h.add = [h.add];

        h.rmv.forEach(function (hdr) {
            const i = arr.indexOf(hdr);
            if (i >= 0 && h.add.indexOf(hdr) === -1) {
                arr.splice(i, 1);
                modified = true;
            }
        });
        h.add.forEach(function (hdr) {
            if (arr.indexOf(hdr) === -1) {
                arr.push(hdr);
                modified = true;
            }
        });
        if (modified) {
            const newPref = arr.join(separator);
            prefs.setCharPref(prefName, newPref);
        }
    }

    function showAlert(strId) {
        const bundle = document.getElementById("bundle_custom");
        const alertText = bundle.getString(strId);
        window.alert(alertText);
        if (prefEl) prefEl.focus();
    }
};

RspamdSpamness.log = function (msg) {
    Services.console.logStringMessage(msg);
};

RspamdSpamness.err = function (msg) {
    Services.console.logStringMessage("ERROR: " + msg);
};

RspamdSpamness.addSpamnessColumn = function () {
    // from chrome://messenger/content/folderDisplay.js
    const fdw = FolderDisplayWidget.prototype;
    fdw.DEFAULT_COLUMNS.push("spamScoreCol");
    fdw.COLUMN_DEFAULT_TESTERS.spamScoreCol = function (viewWrapper) {
        return viewWrapper.isIncomingFolder;
    };
};

RspamdSpamness.openTab = function (url) {
    let tabmail = document.getElementById("tabmail");
    if (!tabmail) {
        const mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
        if (mail3PaneWindow) {
            tabmail = mail3PaneWindow.document.getElementById("tabmail");
            mail3PaneWindow.focus();
        }
    }

    if (tabmail)
        tabmail.openTab("contentTab", {contentPage: url});
    else
        window.openDialog(
            "chrome://messenger/content/", "_blank",
            "chrome,dialog=no,all", null,
            {
                tabParams: {contentPage: url},
                tabType:   "contentTab"
            }
        );
};

RspamdSpamness.greet = function () {
    const greetPage = "chrome://rspamd-spamness/content/installed.xul";
    RspamdSpamness.openTab(greetPage);
};

RspamdSpamness.openAddonOptions = function () {
    AddonManager.getAddonByID("rspamd-spamness@alexander.moisseev", function (addon) {
        const {optionsURL} = addon;
        const type = Number(addon.optionsType);
        if (type === AddonManager.OPTIONS_TYPE_INLINE) {
            window.BrowserOpenAddonsMgr("addons://detail/" + encodeURIComponent(addon.id) + "/preferences");
        } else if (type === AddonManager.OPTIONS_TYPE_TAB && "switchToTabHavingURI" in window) {
            window.switchToTabHavingURI(optionsURL, true);
        } else {
            const windows = Services.wm.getEnumerator(null);
            while (windows.hasMoreElements()) {
                const win = windows.getNext();
                if (win.document.documentURI === optionsURL) {
                    win.focus();
                    return null;
                }
            }
            window.open(optionsURL, "", "chrome=no,titlebar,toolbar,centerscreen,dialog=no", null);
        }
        return null;
    });
};

RspamdSpamness.moveMessage = function (folder, isDefault) {
    function findAccountFromFolder() {
        const theFolder = gMessageDisplay.displayedMessage.folder;

        if (!theFolder)
            return null;

        const {accounts} = Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);

        for (let i = 0; i < accounts.length; i++) {
            const account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
            const {rootFolder} = account.incomingServer;
            if (rootFolder.hasSubFolders) {
                const {subFolders} = rootFolder;
                while (subFolders.hasMoreElements()) {
                    if (theFolder === subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder))
                        return account.QueryInterface(Components.interfaces.nsIMsgAccount).key;
                }
            }
        }

        return null;
    }

    const prefServiceBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService).getBranch("");
    const accountPref = "extensions.rspamd-spamness." + findAccountFromFolder() + ".uri.folder" + folder;

    // Use default URI if account preference doesn't exist
    const URI = Services.prefs.getCharPref(prefServiceBranch.getPrefType(accountPref)
        ? accountPref
        : "extensions.rspamd-spamness.uri.folder" + folder);

    const destination = MailUtils.getFolderForURI(URI);
    if (
        folder === "TrainHam" && (
            isDefault && RspamdSpamness.trainingButtonHamDefaultAction === "copy" ||
            !isDefault && RspamdSpamness.trainingButtonHamDefaultAction !== "copy"
        ) ||
        folder === "TrainSpam" && (
            isDefault && RspamdSpamness.trainingButtonSpamDefaultAction === "copy" ||
            !isDefault && RspamdSpamness.trainingButtonSpamDefaultAction !== "copy"
        )
    )
        MsgCopyMessage(destination);
    else
        MsgMoveMessage(destination);
};

RspamdSpamness.setBtnCmdLabels = function () {
    function setLabel(id, label) {
        const el = document.getElementById(id);
        if (el)
            el.setAttribute("label", label);
    }

    RspamdSpamness.trainingButtonHamDefaultAction =
        Services.prefs.getCharPref("extensions.rspamd-spamness.trainingButtonHam.defaultAction");
    if (RspamdSpamness.trainingButtonHamDefaultAction === "copy") {
        setLabel("btnHamCmdPrimary", "Copy");
        setLabel("btnHamCmdSecondary", "Move");
    } else {
        setLabel("btnHamCmdPrimary", "Move");
        setLabel("btnHamCmdSecondary", "Copy");
    }

    RspamdSpamness.trainingButtonSpamDefaultAction =
        Services.prefs.getCharPref("extensions.rspamd-spamness.trainingButtonSpam.defaultAction");
    if (RspamdSpamness.trainingButtonSpamDefaultAction === "copy") {
        setLabel("btnSpamCmdPrimary", "Copy");
        setLabel("btnSpamCmdSecondary", "Move");
    } else {
        setLabel("btnSpamCmdPrimary", "Move");
        setLabel("btnSpamCmdSecondary", "Copy");
    }
};

RspamdSpamness.hideTrnButtons = function () {
    const hide = !Services.prefs.getBoolPref("extensions.rspamd-spamness.trainingButtons.enabled");
    const elements = document.getElementsByClassName("trn");
    for (let i = 0; i < elements.length; i++) {
        elements[i].hidden = hide;
    }
};
