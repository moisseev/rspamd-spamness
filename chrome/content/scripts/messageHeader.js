RspamdSpamness.Message = {};

RspamdSpamness.Message.displayHeaders = function() {
    const prefs = Services.prefs;

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

    var headerStr = RspamdSpamness.getHeaderStr(hdr);
    if (headerStr == null)
        return null;

    var match = headerStr.match(/: False \[([-\d\.]+) \/ [-\d\.]+\] *(.*)$/);
    if (match == null)
        return null;

    if (showScore) {
        var score = parseFloat(match[1]);
        rowElScore.collapsed = (score == null);

        if (score == null) {
            hdrElScore.headerValue = "";
            return;
        }

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

        var fuzzyCounter = (fuzzySymbolsCount > 1)
            ? "{" + fuzzySymbolsCount + "}"
            : "";

        scoreIcon.src = RspamdSpamness.getImageSrc(score);
        bayesIcon.src = RspamdSpamness.getImageSrc(bayes);
        fuzzyIcon.src = RspamdSpamness.getImageSrc(fuzzy);
        hdrElScore.headerValue = score + " ( Bayes:";
        hdrElBayes.headerValue = bayes + ", Fuzzy" + fuzzyCounter + ":";
        hdrElFuzzy.headerValue = fuzzy + " )";
    }

    if (showRules) {
        if (hdrElRulesBox.clearHeaderValues)
            hdrElRulesBox.clearHeaderValues();

        var rules = [];
        if (match[2] != "") {
            rules = match[2].split(/ /);
        }

        rowElRules.collapsed = (rules.length == 0);
        if (rules.length > 0) {
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
