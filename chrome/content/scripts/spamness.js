var RspamdSpamness = {
    customHeaders: new Array(),
    customDBHeaders: new Array(),
    previousSpamnessHeader: ''
};

RspamdSpamness._bundle = null;

RspamdSpamness.settings = {
    "COLUMN_SHOW_IMAGE_SHOW_TEXT": {
       "value": 0
    },
    "COLUMN_NO_IMAGE_SHOW_TEXT": {
        "value": 1
    },
    "COLUMN_SHOW_IMAGE_NO_TEXT": {
        "value": 2
    }
};

RspamdSpamness._getString = function(key) {
    // return Spamness._bundle.getString(key);
};

RspamdSpamness._getLabel = function(key) {
    // return Spamness._getString(key + ".label");
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

RspamdSpamness.parseHeader = function(headerStr) {
    try {
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
        
        var match2 = headerStr.match(/FUZZY_(WHITE|PROB|DENIED|UNKNOWN)\(([-\d\.]+)\)/);
        if (match2 != null) {
            var fuzzy = parseFloat(match2[2]);
        } else {
            var fuzzy = "undefined";
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

    return new RspamdSpamness.Header(score, rules, bayes, fuzzy);
};

RspamdSpamness.syncHeaderPrefs = function(prefVal) {
    if (!prefVal) {
        prefVal = document.getElementById('headerNameForm').value;
    }
    var prefEl = document.getElementById('headerNameForm');

    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

    if (prefVal != RspamdSpamness.previousSpamnessHeader) {
	    if (!isRFC2822Header(prefVal)) {
	        var bundle = document.getElementById("bundle_custom");
	        var alertText = bundle.getString("colonInHeaderName");
	        window.alert(alertText);
	        if (prefEl) prefEl.focus();
	        return false;
	    }

        var nsMsgSearchAttrib = Components.interfaces.nsMsgSearchAttrib;
        if (Spamness.customHeaders.length + 1 >= (nsMsgSearchAttrib.kNumMsgSearchAttributes - nsMsgSearchAttrib.OtherHeader - 1)) {
	        var bundle = document.getElementById("bundle_custom");
	        var alertText = bundle.getString("customHeaderOverflow");
	        window.alert(alertText);
	        if (prefEl) prefEl.focus();
	        return false;
	    }
    }

    var exists = false;
    var prevExists = -1;
    for (var i = 0; i < RspamdSpamness.customHeaders.length; i++) {
	    if (RspamdSpamness.customHeaders[i] == prefVal) {
	        exists = true;
	    }
	    if (RspamdSpamness.customHeaders[i] == RspamdSpamness.previousSpamnessHeader) {
	        prevExists = i;
	    }
    }
    if (!exists) {
	    if (prevExists >= 0) {
	        RspamdSpamness.customHeaders.splice(prevExists, 1);
	    }
	    RspamdSpamness.customHeaders.push(prefVal);
	    var newPref = RspamdSpamness.customHeaders.join(": ");
	    prefs.setCharPref("mailnews.customHeaders", newPref);
    }

    exists = false;
    prevExists = -1;
    for (var i = 0; i < RspamdSpamness.customDBHeaders.length; i++) {
	    if (RspamdSpamness.customDBHeaders[i] == prefVal) {
	        exists = true;
	    }
	    if (RspamdSpamness.customDBHeaders[i] == RspamdSpamness.previousSpamnessHeader) {
	        prevExists = i;
	    }
    }
    if (!exists) {
	    if (prevExists >= 0) {
	        RspamdSpamness.customDBHeaders.splice(prevExists, 1);
	    }
	    RspamdSpamness.customDBHeaders.push(prefVal);
	    var newPref = RspamdSpamness.customDBHeaders.join(" ");
	    prefs.setCharPref("mailnews.customDBHeaders", newPref);
    }

    prefs.setCharPref("extensions.rspamd-spamness.header", prefVal);
    RspamdSpamness.previousSpamnessHeader = prefVal;

    // flush to disk
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefService.savePrefFile(null);
    return true;
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
    Spamness.openTab(greetPage);
};

RspamdSpamness.Header = function(score, rules, bayes, fuzzy) {
    this._score = score;
    this._rules = rules;
    this._bayes = bayes;
    this._fuzzy = fuzzy;
};

RspamdSpamness.Header.prototype.getScore = function() {
    return this._score;
};

RspamdSpamness.Header.prototype.getRules = function() {
    return this._rules;
};

RspamdSpamness.Header.prototype.getBayes = function() {
    return this._bayes;
};

RspamdSpamness.Header.prototype.getFuzzy = function() {
    return this._fuzzy;
};
