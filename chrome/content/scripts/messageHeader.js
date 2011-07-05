Spamness.Message = {};

Spamness.Message.displayScoreHeader = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch);
    var showScore = prefs.getBoolPref("extensions.spamness.display.messageScore");
    var rowEl = document.getElementById("expandedSpamnessRow");
    var hdrEl = document.getElementById("spamnessScoreHeader");
    if (!showScore) {
        rowEl.collapsed = true;
	return;
    } else {
        rowEl.collapsed = false;
    }

    var header = Spamness.getHeaderName(prefs);
    var uri = gMessageDisplay.folderDisplay.selectedMessageUris[0];

    if (uri == null)
	return;

    var hdr = gDBView.msgFolder.GetMessageHeader(gDBView.getKeyAt(gDBView.currentlyDisplayedMessage));

    if (hdr == null || hdr.getStringProperty(header) == null)
	return;

    var parsed = Spamness.parseHeader(hdr.getStringProperty(header));
    rowEl.collapsed = (parsed == null);
    hdrEl.headerValue = (parsed != null) ? parsed.getNormalScore() + " (" +  parsed.getScore() + " / " + parsed.getThreshold() + ")" : "";
    hdrEl.valid = true;
};

Spamness.Message.displayRulesHeader = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch);
    var showRules = prefs.getBoolPref("extensions.spamness.display.messageRules");
    var rowEl = document.getElementById("expandedSpamnessRulesRow");
    var hdrEl = document.getElementById("spamnessRulesHeader");
    if (!showRules) {
        rowEl.collapsed = true;
	return;
    } else {
        rowEl.collapsed = false;
    }

    var header = Spamness.getHeaderName(prefs);
    var uri = gMessageDisplay.folderDisplay.selectedMessageUris[0];

    if (uri == null)
	return;

    var hdr = gDBView.msgFolder.GetMessageHeader(gDBView.getKeyAt(gDBView.currentlyDisplayedMessage));

    if (hdr == null || hdr.getStringProperty(header) == null)
	return;

    var parsed = Spamness.parseHeader(hdr.getStringProperty(header));
    rowEl.collapsed = (parsed == null);
    if (parsed != null && parsed.getRules().length > 0) {
        var rules = parsed.getRules();
        for (var i = 0; i < rules.length; i++) {
            // var url = Spamness.generateRulesURL(rules[i]);
        }
        // make each piece an element with a click handler that opens
        // a content tab
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
