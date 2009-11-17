Spamness.Message = {};

Spamness.Message.displayScoreHeader = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch);
    var showScore = prefs.getBoolPref("extensions.spamness.display.messageScore");
    var hdrEl = document.getElementById("spamnessScoreHeader");
    if (!showScore) {
        hdrEl.collapsed = true;
	return;
    } else {
        hdrEl.collapsed = false;
    }

    var header = Spamness.getHeaderName(prefs);
    var uri = GetLoadedMessage();

    if (uri == null)
	return;

    var hdr = gDBView.msgFolder.GetMessageHeader(gDBView.getKeyAt(gDBView.currentlyDisplayedMessage));

    if (hdr == null || hdr.getStringProperty(header) == null)
	return;

    var parsed = Spamness.parseHeader(hdr.getStringProperty(header));
    hdrEl.collapsed = (parsed == null);
    hdrEl.headerValue = (parsed != null) ? parsed.getNormalScore() + " (" +  parsed.getScore() + " / " + parsed.getThreshold() + ")" : "";
    hdrEl.valid = true;
};

Spamness.Message.displayRulesHeader = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch);
    var showRules = prefs.getBoolPref("extensions.spamness.display.messageRules");
    var hdrEl = document.getElementById("spamnessRulesHeader");
    if (!showRules) {
        hdrEl.collapsed = true;
	return;
    } else {
        hdrEl.collapsed = false;
    }

    var header = Spamness.getHeaderName(prefs);
    var uri = GetLoadedMessage();

    if (uri == null)
	return;

    var hdr = gDBView.msgFolder.GetMessageHeader(gDBView.getKeyAt(gDBView.currentlyDisplayedMessage));

    if (hdr == null || hdr.getStringProperty(header) == null)
	return;

    var parsed = Spamness.parseHeader(hdr.getStringProperty(header));
    hdrEl.collapsed = (parsed == null);
    if (parsed != null && parsed.getRules().length > 0) {
        var rules = parsed.getRules();
        for (var i = 0; i < rules.length; i++) {
            // var url = Spamness.generateRulesURL(rules[i]);
        }
        hdrEl.headerValue = rules.join(", ");
    } else {
        hdrEl.headerValue = "";
    }
    hdrEl.valid = true;
};

Spamness.Message.onLoad = function() {
    var listener = {};
    listener.onStartHeaders = function() {};
    listener.onEndHeaders = function() {
        Spamness.Message.displayScoreHeader();
        // Spamness.Message.displayRulesHeader();
    };
    gMessageListeners.push(listener);
};

Spamness.Message.onUnload = function() {
    window.removeEventListener('load', Spamness.Message.onLoad, false);
    window.removeEventListener('unload', Spamness.Message.onUnload, false);
};

window.addEventListener("load", Spamness.Message.onLoad, false);
window.addEventListener("unload", Spamness.Message.onUnload, false);
