"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");

var RspamdSpamness = {
    customHeaders: new Array(),
    customDBHeaders: new Array(),
    previousSpamnessHeader: "",
    trainingButtonDefaultAction: "move"
};

RspamdSpamness.getImageSrc = function(normalized) {
    var img, level;
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
    var metric = rule.match(/\(([-\d.]+)\)$/);
    var metricScore = (metric)
        ? metric[1]
        : null;
    if (metricScore < 0) {
        return "linkDisplayButtonHam";
    } else if (metricScore > 0) {
        return "linkDisplayButtonSpam";
    } else {
        return null;
    }
}

RspamdSpamness.getHeaderStr = function(hdr) {
    var header = Services.prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();
    var headerStr = hdr.getStringProperty(header);
    return (headerStr) ? headerStr : null;
};

RspamdSpamness.syncHeaderPrefs = function(prefVal) {
    if (!prefVal) {
        prefVal = document.getElementById('headerNameForm').value;
    }
    var prefEl = document.getElementById('headerNameForm');
    const prefs = Services.prefs;
    RspamdSpamness.previousSpamnessHeader = prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();

    RspamdSpamness.customDBHeaders = getHeadersPref("mailnews.customDBHeaders", /\s+/);
    RspamdSpamness.customHeaders   = getHeadersPref("mailnews.customHeaders", /\s*:\s*/);

    if (prefVal != RspamdSpamness.previousSpamnessHeader) {
        if (!isRFC5322HeaderName(prefVal)) {
	        var bundle = document.getElementById("bundle_custom");
	        var alertText = bundle.getString("colonInHeaderName");
	        window.alert(alertText);
	        if (prefEl) prefEl.focus();
	        return false;
	    }

        var nsMsgSearchAttrib = Components.interfaces.nsMsgSearchAttrib;
        if (RspamdSpamness.customHeaders.length + 1 >= (nsMsgSearchAttrib.kNumMsgSearchAttributes - nsMsgSearchAttrib.OtherHeader - 1)) {
	        var bundle = document.getElementById("bundle_custom");
	        var alertText = bundle.getString("customHeaderOverflow");
	        window.alert(alertText);
	        if (prefEl) prefEl.focus();
	        return false;
	    }
    }

    setHeadersPref("mailnews.customDBHeaders", RspamdSpamness.customDBHeaders, " ",
        RspamdSpamness.previousSpamnessHeader, prefVal);
    setHeadersPref("mailnews.customHeaders",   RspamdSpamness.customHeaders,   ": ",
        RspamdSpamness.previousSpamnessHeader, [prefVal, "x-spam-score"]);

    prefs.setCharPref("extensions.rspamd-spamness.header", prefVal);
    RspamdSpamness.previousSpamnessHeader = prefVal;

    // flush to disk
    prefs.savePrefFile(null);
    return true;

    function getHeadersPref(prefName, separator) {
        var chdrs = prefs.getCharPref(prefName).trim();
        return (chdrs === "")
            ? []
            : chdrs.split(separator);
    }

    function isRFC5322HeaderName(str) {
        return /^[\x21-\x39\x3B-\x7E]+$/.test(str);
    }

    function setHeadersPref(prefName, arr, separator, rmvHeaders, addHeaders) {
        let modified;
        if (typeof rmvHeaders == "string")
            rmvHeaders = [rmvHeaders];
        if (typeof addHeaders == "string")
            addHeaders = [addHeaders];

        rmvHeaders.forEach(function (hdr) {
            const i = arr.indexOf(hdr);
            if (i >= 0 && addHeaders.indexOf(hdr) == -1) {
                arr.splice(i, 1);
                modified = true;
            }
        });
        addHeaders.forEach(function (hdr) {
            if (arr.indexOf(hdr) == -1) {
                arr.push(hdr);
                modified = true;
            }
        });
        if (modified) {
            var newPref = arr.join(separator);
            prefs.setCharPref(prefName, newPref);
        }
    }
};

RspamdSpamness.log = function(msg) {
    Services.console.logStringMessage(msg);
};

RspamdSpamness.err = function(msg) {
    Services.console.logStringMessage("ERROR: " + msg);
};

RspamdSpamness.addSpamnessColumn = function() {
    // from chrome://messenger/content/folderDisplay.js
    var fdw = FolderDisplayWidget.prototype;
    fdw.DEFAULT_COLUMNS.push("spamScoreCol");
    fdw.COLUMN_DEFAULT_TESTERS["spamScoreCol"] = function(viewWrapper) {
        return viewWrapper.isIncomingFolder;
    };
};

RspamdSpamness.openTab = function(url) {
    let tabmail = document.getElementById("tabmail");
    if (!tabmail) {
        let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
        if (mail3PaneWindow) {
            tabmail = mail3PaneWindow.document.getElementById("tabmail");
            mail3PaneWindow.focus();
        }
    }

    if (tabmail)
        tabmail.openTab("contentTab", {contentPage: url});
    else
        window.openDialog("chrome://messenger/content/", "_blank",
                          "chrome,dialog=no,all", null,
                          { tabType: "contentTab",
                            tabParams: { contentPage: url }});
};

RspamdSpamness.greet = function() {
    let greetPage = "chrome://rspamd-spamness/content/installed.xul";
    RspamdSpamness.openTab(greetPage);
};

RspamdSpamness.moveMessage = function (folder, isDefault) {
    var destination = MailUtils.getFolderForURI(Services.prefs.getCharPref("extensions.rspamd-spamness.uri.folder" + folder));
    if (isDefault && RspamdSpamness.trainingButtonDefaultAction == "copy" ||
        !isDefault && RspamdSpamness.trainingButtonDefaultAction != "copy")
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

    if (RspamdSpamness.trainingButtonDefaultAction == "copy") {
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
