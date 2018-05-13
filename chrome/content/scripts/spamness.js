"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");

var RspamdSpamness = {
    customDBHeaders: [],
    customHeaders: [],
    previousSpamnessHeader: "",
    trainingButtonDefaultAction: "move"
};

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

RspamdSpamness.syncHeaderPrefs = function (prefValue) {
    let prefVal = prefValue;
    if (!prefVal) {
        prefVal = document.getElementById("headerNameForm").value;
    }
    const prefEl = document.getElementById("headerNameForm");
    const {prefs} = Services;
    RspamdSpamness.previousSpamnessHeader = prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();

    RspamdSpamness.customDBHeaders = getHeadersPref("mailnews.customDBHeaders", /\s+/);
    RspamdSpamness.customHeaders   = getHeadersPref("mailnews.customHeaders", /\s*:\s*/);

    if (prefVal !== RspamdSpamness.previousSpamnessHeader) {
        if (!isRFC5322HeaderName(prefVal)) {
            showAlert("colonInHeaderName");
            return false;
        }

        const {nsMsgSearchAttrib} = Components.interfaces;
        if (RspamdSpamness.customHeaders.length + 1 >= (nsMsgSearchAttrib.kNumMsgSearchAttributes - nsMsgSearchAttrib.OtherHeader - 1)) {
            showAlert("customHeaderOverflow");
            return false;
        }
    }

    setHeadersPref(
        "mailnews.customDBHeaders", RspamdSpamness.customDBHeaders, " ",
        RspamdSpamness.previousSpamnessHeader, prefVal
    );
    setHeadersPref(
        "mailnews.customHeaders",   RspamdSpamness.customHeaders,   ": ",
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
        return /^[\x21-\x39\x3B-\x7E]+$/.test(str);
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
                tabType: "contentTab"
            }
        );
};

RspamdSpamness.greet = function () {
    const greetPage = "chrome://rspamd-spamness/content/installed.xul";
    RspamdSpamness.openTab(greetPage);
};

RspamdSpamness.moveMessage = function (folder, isDefault) {
    const destination = MailUtils.getFolderForURI(Services.prefs.getCharPref("extensions.rspamd-spamness.uri.folder" + folder));
    if (isDefault && RspamdSpamness.trainingButtonDefaultAction === "copy" ||
        !isDefault && RspamdSpamness.trainingButtonDefaultAction !== "copy")
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

    RspamdSpamness.trainingButtonDefaultAction = Services.prefs.getCharPref("extensions.rspamd-spamness.trainingButtons.defaultAction");

    if (RspamdSpamness.trainingButtonDefaultAction === "copy") {
        setLabel("btnHamCmdPrimary", "Copy");
        setLabel("btnSpamCmdPrimary", "Copy");
        setLabel("btnHamCmdSecondary", "Move");
        setLabel("btnSpamCmdSecondary", "Move");
    } else {
        setLabel("btnHamCmdPrimary", "Move");
        setLabel("btnSpamCmdPrimary", "Move");
        setLabel("btnHamCmdSecondary", "Copy");
        setLabel("btnSpamCmdSecondary", "Copy");
    }
};
