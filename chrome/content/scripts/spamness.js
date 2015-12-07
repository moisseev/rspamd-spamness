var Spamness = {
    customHeaders: new Array(),
    customDBHeaders: new Array(),
    previousSpamnessHeader: ''
};

Spamness._bundle = null;

Spamness.settings = {
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

Spamness._getString = function(key) {
    // return Spamness._bundle.getString(key);
};

Spamness._getLabel = function(key) {
    // return Spamness._getString(key + ".label");
};

Spamness.getImageSrc = function(normalized) {
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

Spamness.getMetricClass = function(rule) {
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

Spamness.parseHeader = function(headerStr) {
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

    return new Spamness.Header(score, rules, bayes, fuzzy);
};

Spamness.syncHeaderPrefs = function(prefVal) {
    if (!prefVal) {
        prefVal = document.getElementById('headerNameForm').value;
    }
    var prefEl = document.getElementById('headerNameForm');

    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

    if (prefVal != Spamness.previousSpamnessHeader) {
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
    for (var i = 0; i < Spamness.customHeaders.length; i++) {
	    if (Spamness.customHeaders[i] == prefVal) {
	        exists = true;
	    }
	    if (Spamness.customHeaders[i] == Spamness.previousSpamnessHeader) {
	        prevExists = i;
	    }
    }
    if (!exists) {
	    if (prevExists >= 0) {
	        Spamness.customHeaders.splice(prevExists, 1);
	    }
	    Spamness.customHeaders.push(prefVal);
	    var newPref = Spamness.customHeaders.join(": ");
	    prefs.setCharPref("mailnews.customHeaders", newPref);
    }

    exists = false;
    prevExists = -1;
    for (var i = 0; i < Spamness.customDBHeaders.length; i++) {
	    if (Spamness.customDBHeaders[i] == prefVal) {
	        exists = true;
	    }
	    if (Spamness.customDBHeaders[i] == Spamness.previousSpamnessHeader) {
	        prevExists = i;
	    }
    }
    if (!exists) {
	    if (prevExists >= 0) {
	        Spamness.customDBHeaders.splice(prevExists, 1);
	    }
	    Spamness.customDBHeaders.push(prefVal);
	    var newPref = Spamness.customDBHeaders.join(" ");
	    prefs.setCharPref("mailnews.customDBHeaders", newPref);
    }

    prefs.setCharPref("extensions.rspamd-spamness.header", prefVal);
    Spamness.previousSpamnessHeader = prefVal;

    // flush to disk
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefService.savePrefFile(null);
    return true;
};

Spamness.log = function(msg) {
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage(msg);
};

Spamness.error = function(msg) {
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage("ERROR: " + msg);
};

Spamness.addSpamnessColumn = function() {
    // from chrome://messenger/content/folderDisplay.js
    var fdw = FolderDisplayWidget.prototype;
    fdw.DEFAULT_COLUMNS.push("spamScoreCol");
    fdw.COLUMN_DEFAULT_TESTERS["spamScoreCol"] = function(viewWrapper) {
        return viewWrapper.isIncomingFolder;
    };
};

Spamness.openTab = function(url) {
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

Spamness.greet = function() {
    let greetPage = "chrome://rspamd-spamness/content/installed.xul";
    Spamness.openTab(greetPage);
};

Spamness.Header = function(score, rules, bayes, fuzzy) {
    this._score = score;
    this._rules = rules;
    this._bayes = bayes;
    this._fuzzy = fuzzy;
};

Spamness.Header.prototype.getScore = function() {
    return this._score;
};

Spamness.Header.prototype.getRules = function() {
    return this._rules;
};

Spamness.Header.prototype.getBayes = function() {
    return this._bayes;
};

Spamness.Header.prototype.getFuzzy = function() {
    return this._fuzzy;
};
