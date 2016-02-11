"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");

var RspamdSpamness = {
    customHeaders: new Array(),
    customDBHeaders: new Array(),
    previousSpamnessHeader: ''
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

RspamdSpamness.getMetricClass = function(rule) {
          var metric = rule.match(/\(([-\d\.]+)\)$/);
          var metricScore = metric[1];
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

    setHeadersPref("mailnews.customDBHeaders", RspamdSpamness.customDBHeaders, " " );
    setHeadersPref("mailnews.customHeaders",   RspamdSpamness.customHeaders,   ": ");
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

    function setHeadersPref(prefName, headersArray, separator) {
        var exists = false;
        var prevExists = -1;
        for (var i = 0; i < headersArray.length; i++) {
            if (headersArray[i] == prefVal) {
                exists = true;
            }
            if (headersArray[i] == RspamdSpamness.previousSpamnessHeader) {
                prevExists = i;
            }
        }
        if (!exists || prevExists >= 0) {
            if (prefVal != RspamdSpamness.previousSpamnessHeader && prevExists >= 0) {
                headersArray.splice(prevExists, 1);
            }
            if (!exists) {
                headersArray.push(prefVal);
            }
            var newPref = headersArray.join(separator);
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
