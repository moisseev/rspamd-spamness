var Spamness = {};

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

Spamness.generateRulesURL = function(rule) {
    if (/^[A-Z0-9_]+$/.test(rules)) {
        return "http://wiki.apache.org/spamassassin/Rules/" + rule;
    } else {
	return null;
    }
}

Spamness.parseHeader = function(headerStr) {
    // @@@ remove all newlines
    try {
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

    var rulesIdx = headerStr.indexOf("tests=");
    var endRulesIdx = headerStr.indexOf(" ", threshIdx);
    var rulesStr = headerStr.substring(rulesIdx + "tests=".length, endRulesIdx);
    // @@@ var rules = rulesStr.split(/,/, ...);

    return new Spamness.Header(score, thresh, []);
};

Spamness.onLoad = function() {
    // Spamness._bundle = document.getElementById("bundle_spamness");
};

Spamness.onUnload = function() {
    window.removeEventListener('load', Spamness.onLoad, false);
    window.removeEventListener('unload', Spamness.onUnload, false);
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

//window.addEventListener("load", Spamness.onLoad, false);
//window.addEventListener("unload", Spamness.onUnload, false);
