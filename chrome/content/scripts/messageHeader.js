RspamdSpamness.Message = {};

RspamdSpamness.Message.displayHeaders = function() {
    var showScore = prefs.getBoolPref("extensions.rspamd-spamness.display.messageScore");
    var rowElScore = document.getElementById("expandedRspamdSpamnessRow");
    var hdrElScore = document.getElementById("rspamdSpamnessScoreHeader");
    var hdrElBayes = document.getElementById("rspamdSpamnessBayesHeader");
    var hdrElFuzzy = document.getElementById("rspamdSpamnessFuzzyHeader");

    var scoreIcon = document.getElementById("rspamdSpamnessScoreIcon");
    var bayesIcon = document.getElementById("rspamdSpamnessBayesIcon");
    var fuzzyIcon = document.getElementById("rspamdSpamnessFuzzyIcon");

    var showRules = prefs.getBoolPref("extensions.rspamd-spamness.display.messageRules");
    var rowElRules = document.getElementById("expandedRspamdSpamnessRulesRow");
    var hdrElRulesBox = document.getElementById("expandedRspamdSpamnessRulesBox");

    rowElScore.collapsed = true;
    rowElRules.collapsed = true;

    if (!showScore && !showRules)
        return;

    if (gDBView.msgFolder == null)
        return;

    var hdr = gDBView.msgFolder.GetMessageHeader(gDBView.getKeyAt(gDBView.currentlyDisplayedMessage));

    if (!hdr)
        return;

    var parsed = RspamdSpamness.parseHeader(hdr);

    if (showScore) {
        rowElScore.collapsed = (parsed == null);

        if (parsed == null) {
            hdrElScore.headerValue = "";
            return;
        }

        var fuzzyCounter = (parsed.fuzzy.count > 1)
            ? "{" + parsed.fuzzy.count + "}"
            : "";

        scoreIcon.src = RspamdSpamness.getImageSrc(parsed.score);
        bayesIcon.src = RspamdSpamness.getImageSrc(parsed.bayes);
        fuzzyIcon.src = RspamdSpamness.getImageSrc(parsed.fuzzy.score);
        hdrElScore.headerValue = parsed.score + " ( Bayes:";
        hdrElBayes.headerValue = parsed.bayes + ", Fuzzy" + fuzzyCounter + ":";
        hdrElFuzzy.headerValue = parsed.fuzzy.score + " )";
    }

    if (showRules) {
        if (hdrElRulesBox.clearHeaderValues)
            hdrElRulesBox.clearHeaderValues();

        var rules = (parsed == null) ? [] : parsed.rules;
        rowElRules.collapsed = (rules.length == 0);
        if (parsed != null && rules.length > 0) {
            for (var i = 0; i < rules.length; i++) {
                var link = {};
                link.displayText = rules[i];
                link.class = RspamdSpamness.getMetricClass(rules[i]);
                hdrElRulesBox.addLinkView(link);
            }
            hdrElRulesBox.buildViews();
        }
    }
};

RspamdSpamness.Message.onLoad = function() {
    var listener = {};
    listener.onStartHeaders = function() {};
    listener.onEndHeaders = function() {
        RspamdSpamness.Message.displayHeaders();
    };
    gMessageListeners.push(listener);
};

RspamdSpamness.Message.onUnload = function() {
    window.removeEventListener("load", RspamdSpamness.Message.onLoad, false);
    window.removeEventListener("unload", RspamdSpamness.Message.onUnload, false);
};

window.addEventListener("load", RspamdSpamness.Message.onLoad, false);
window.addEventListener("unload", RspamdSpamness.Message.onUnload, false);
