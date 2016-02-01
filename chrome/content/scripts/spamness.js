var RspamdSpamness = {
    customHeaders: new Array(),
    customDBHeaders: new Array(),
    previousSpamnessHeader: ''
};

RspamdSpamness.getImageSrc = function(normalized) {
    var img;
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
    var header = prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();
    var headerStr = hdr.getStringProperty(header);
    return (headerStr) ? headerStr : null;
};

RspamdSpamness.parseHeader = function(hdr) {
    try {
        var headerStr = RspamdSpamness.getHeaderStr(hdr);

        var match = headerStr.match(/: False \[([-\d\.]+) \/ [-\d\.]+\] *(.*)$/);
        if (match == null) {
            throw "No score found";
        }
        var score = parseFloat(match[1]);

        var match1 = headerStr.match(/BAYES_(HAM|SPAM)\(([-\d\.]+)\)/);
        if (match1 != null) {
            var bayes = parseFloat(match1[2]);
        } else {
            var bayes = "undefined";
        }

        var re = /FUZZY_(?:WHITE|PROB|DENIED|UNKNOWN)\(([-\d\.]+)\)/g;
        var fuzzySymbols = [];
        var fuzzy = 0;
        var fuzzySymbolsCount = 0;
        while ((fuzzySymbols = re.exec(headerStr)) != null) {
            fuzzy += parseFloat(fuzzySymbols[1]);
            fuzzySymbolsCount++;
        }
        if (fuzzySymbolsCount === 0) {
            fuzzy = "undefined";
        }
    } catch(e) {
        // Spamness.error(e);
        return null;
    }

    var rules = [];
    try {
        if (match[2] != "") {
            rules = match[2].split(/ /);
        }
    } catch(e) {
        // Spamness.error(e);
    }

    return {
        score: score,
        rules: rules,
        bayes: bayes,
        fuzzy: {
            score: fuzzy,
            count: fuzzySymbolsCount
        }
    };
};

RspamdSpamness.syncHeaderPrefs = function(prefVal) {
    if (!prefVal) {
        prefVal = document.getElementById('headerNameForm').value;
    }
    var prefEl = document.getElementById('headerNameForm');

    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
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
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefService.savePrefFile(null);
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
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage(msg);
};

RspamdSpamness.error = function(msg) {
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage("ERROR: " + msg);
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
        let mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
            .getService(Components.interfaces.nsIWindowMediator)
            .getMostRecentWindow("mail:3pane");
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
