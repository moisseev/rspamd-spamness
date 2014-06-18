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

Spamness.getHeaderName = function(prefs) {
    if (!prefs)
        prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch);
    var header = prefs.getCharPref("extensions.spamness.header");
    return header.toLowerCase();
};

Spamness.generateRulesURL = function(rule) {
    if (/^[A-Z0-9_]+$/.test(rule)) {
        return "http://wiki.apache.org/spamassassin/Rules/" + rule;
    } else {
        return null;
    }
}

Spamness.parseHeader = function(headerStr) {
    if (Spamness.getHeaderName() == "x-spamd-result") {
        return Spamness.parseRspamdHeader(headerStr);
    } else {
        return Spamness.parseSpamAssassinHeader(headerStr);
    }
};

Spamness.parseRspamdHeader = function(headerStr) {
    try {
        var match = headerStr.match(/: False \[([-\d\.]+) \/ ([-\d\.]+)\] *(.*)$/);
        if (match == null) {
            throw "No score found";
        }
        var score = parseFloat(match[1]);
    } catch(e) {
        // Spamness.error(e);
        return null;
    }

    var rules = [];
    try {
        var rulesStr = match[3];
        rules = rulesStr.split(/ /);
    } catch(e) {
        // Spamness.error(e);
    }

    return new Spamness.Header(score, 0, rules);
};

Spamness.parseSpamAssassinHeader = function(headerStr) {
    try {
        headerStr = headerStr.replace(/[\n\r]/g, ''); 
        headerStr = headerStr.replace(/\t/g, ' '); 
        headerStr = headerStr.replace(/, /g, ','); 
        var scoreprefix = "score=";
        var scoreIdx = headerStr.indexOf("score=");
        if (scoreIdx < 0) {
            scoreprefix = "hits=";
            scoreIdx = headerStr.indexOf("hits=");
        }
        if (scoreIdx < 0) {
            throw "No score found";
        }
        var endScoreIdx = headerStr.indexOf(" ", scoreIdx);
        if (endScoreIdx < 0) {
            throw "No score found";
        }
        var score = parseFloat(headerStr.substring(scoreIdx + scoreprefix.length, endScoreIdx));

        var threshIdx = headerStr.indexOf("required=");
        if (threshIdx < 0)
            throw "No threshold found";
        var endThreshIdx = headerStr.indexOf(" ", threshIdx);
        if (endThreshIdx <  0) {
            var lines = headerStr.split(/\n/);
            endThreshIdx = lines[0].length - 1;
        }
        if (endThreshIdx < 0) {
            throw "No threshold found";
        }
        var thresh = parseFloat(headerStr.substring(threshIdx + "required=".length, endThreshIdx));
    } catch(e) {
	// Spamness.error(e);
	return null;
    }

    var rules = [];
    try {
        var rulesIdx = headerStr.indexOf("tests=");
        var endRulesIdx = headerStr.indexOf(" ", rulesIdx);
        var rulesStr = headerStr.substring(rulesIdx + "tests=".length, endRulesIdx);
        rules = rulesStr.split(/,/);
    } catch(e) {
	// Spamness.error(e);
    }

    return new Spamness.Header(score, thresh, rules);
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

    prefs.setCharPref("extensions.spamness.header", prefVal);
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
    fdw.DEFAULT_COLUMNS.push("colSpamStatus");
    fdw.COLUMN_DEFAULT_TESTERS["colSpamStatus"] = function(viewWrapper) {
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
    let greetPage = "chrome://spamness/content/installed.xul";
    Spamness.openTab(greetPage);
};

Spamness.Header = function(score, threshold, rules) {
    this._score = score;
    this._threshold = threshold;
    this._rules = rules;
};

Spamness.Header.prototype.getScore = function() {
    return this._score;
};

Spamness.Header.prototype.getThreshold = function() {
    return this._threshold;
};

Spamness.Header.prototype.getNormalScore = function() {
    return Math.round((this.getScore() - this.getThreshold()) * 100) / 100.0;
};

Spamness.Header.prototype.getRules = function() {
    return this._rules;
};
