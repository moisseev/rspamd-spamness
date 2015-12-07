Spamness.Message = {};

Spamness.Message.displayScoreHeader = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch);
    var showScore = prefs.getBoolPref("extensions.rspamd-spamness.display.messageScore");
    var rowEl = document.getElementById("expandedRspamdSpamnessRow");
    var hdrEl = document.getElementById("rspamdSpamnessScoreHeader");
    var hdrElBayes = document.getElementById("rspamdSpamnessBayesHeader");
    var hdrElFuzzy = document.getElementById("rspamdSpamnessFuzzyHeader");
    var scoreIcon = document.getElementById("rspamdSpamnessScoreIcon");
    var bayesIcon = document.getElementById("rspamdSpamnessBayesIcon");
    var fuzzyIcon = document.getElementById("rspamdSpamnessFuzzyIcon");
    
    rowEl.collapsed = true;

    if (!showScore)
        return;

    var header = prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();
    var uri = gMessageDisplay.folderDisplay.selectedMessageUris[0];

//    if (uri == null)
//        return;

    if (gDBView.msgFolder == null)
        return;

    var hdr = gDBView.msgFolder.GetMessageHeader(gDBView.getKeyAt(gDBView.currentlyDisplayedMessage));

    if (hdr == null || hdr.getStringProperty(header) == null)
        return;

    var parsed = Spamness.parseHeader(hdr.getStringProperty(header));
    rowEl.collapsed = (parsed == null);

    if (parsed == null) {
        hdrEl.headerValue = "";
        return;
    }
    
    scoreIcon.src = Spamness.getImageSrc(parsed.getScore());
    bayesIcon.src = Spamness.getImageSrc(parsed.getBayes());
    fuzzyIcon.src = Spamness.getImageSrc(parsed.getFuzzy());
    hdrEl.headerValue = parsed.getScore() + " ( Bayes:";
    hdrElBayes.headerValue = parsed.getBayes() + ", Fuzzy:";
    hdrElFuzzy.headerValue = parsed.getFuzzy() + " )";
//    hdrEl.valid = true;
};

Spamness.Message.displayRulesHeader = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch);
    var showRules = prefs.getBoolPref("extensions.rspamd-spamness.display.messageRules");
    var rowEl = document.getElementById("expandedRspamdSpamnessRulesRow");
    var hdrEl = document.getElementById("expandedRspamdSpamnessRulesBox");

    rowEl.collapsed = true;

    if (!showRules) {
        return;
    } else {
        if (hdrEl.clearHeaderValues)
            hdrEl.clearHeaderValues();
    }

    var header = prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();
    var uri = gMessageDisplay.folderDisplay.selectedMessageUris[0];

//    if (uri == null)
//        return;

    if (gDBView.msgFolder == null)
        return;
        
    var hdr = gDBView.msgFolder.GetMessageHeader(gDBView.getKeyAt(gDBView.currentlyDisplayedMessage));

    if (hdr == null || hdr.getStringProperty(header) == null)
        return;

    var parsed = Spamness.parseHeader(hdr.getStringProperty(header));

    var rules = (parsed == null) ? [] : parsed.getRules();
    rowEl.collapsed = (rules.length == 0);
    if (parsed != null && rules.length > 0) {
        for (var i = 0; i < rules.length; i++) {
            var link = {};
            link.displayText = rules[i];
            link.class = Spamness.getMetricClass(rules[i]);
            hdrEl.addLinkView(link);
        }
        hdrEl.valid = true;
        hdrEl.buildViews();
    }
};

Spamness.Message.onLoad = function() {
    var listener = {};
    listener.onStartHeaders = function() {};
    listener.onEndHeaders = function() {
        Spamness.Message.displayScoreHeader();
        Spamness.Message.displayRulesHeader();
    };
    gMessageListeners.push(listener);
};

Spamness.Message.onUnload = function() {
    window.removeEventListener("load", Spamness.Message.onLoad, false);
    window.removeEventListener("unload", Spamness.Message.onUnload, false);
};

window.addEventListener("load", Spamness.Message.onLoad, false);
window.addEventListener("unload", Spamness.Message.onUnload, false);
