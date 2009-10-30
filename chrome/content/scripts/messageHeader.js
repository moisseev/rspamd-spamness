Spamness.Message = {};

Spamness.Message.scoreContainer = null;
Spamness.Message.rulesContainer = null;

Spamness.Message.resetScoreHeader = function() {
    Spamness.Message.scoreContainer.removeChild(Spamness.Message.scoreContainer.lastChild);
};

Spamness.Message.displayScoreHeader = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch);
    var showScore = prefs.getBoolPref("extensions.spamness.display.messageScore");
    if (!showScore) {
        document.getElementById("expandedspamnessBox").collapsed = true;
        document.getElementById("spamnessHeader").collapsed = true;
	return;
    } else {
        document.getElementById("expandedspamnessBox").collapsed = false;
        document.getElementById("spamnessHeader").collapsed = false;
    }

    Spamness.Message.scoreContainer = document.getElementById("spamness-messageHeader-value");
    Spamness.Message.resetScoreHeader();

    var header = prefs.getCharPref("extensions.spamness.header");

    var uri = GetLoadedMessage();

    if (uri == null)
	return;

    var hdr = gDBView.msgFolder.GetMessageHeader(gDBView.getKeyAt(gDBView.currentlyDisplayedMessage));

    if (hdr == null || hdr.getStringProperty(header) == null)
	return;

    var parsed = Spamness.parseHeader(hdr.getStringProperty(header));
    var label = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
    document.getElementById("expandedspamnessBox").collapsed = (parsed == null);
    label.setAttribute("flex", "1");
    label.setAttribute("class", "textbox-input spamness-disguise");
    label.setAttribute("readonly", true);
    label.setAttribute("align", "start");
    label.setAttribute("value", (parsed != null) ? parsed.getNormalScore() + " (" +  parsed.getScore() + " / " + parsed.getThreshold() + ")" : "");
    Spamness.Message.scoreContainer.appendChild(label);
};

Spamness.Message.resetRulesHeader = function() {
    Spamness.Message.rulesContainer.removeChild(Spamness.Message.rulesContainer.lastChild);
};

Spamness.Message.displayRulesHeader = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch);
    var showRules = prefs.getBoolPref("extensions.spamness.display.messageRules");
    if (!showRules) {
        document.getElementById("expandedspamness-rulesBox").collapsed = true;
        document.getElementById("spamnessRulesHeader").collapsed = true;
	return;
    } else {
        document.getElementById("expandedspamness-rulesBox").collapsed = false;
        document.getElementById("spamnessRulesHeader").collapsed = false;
    }

    Spamness.Message.rulesContainer = document.getElementById("spamness-rulesMessageHeader-value");
    Spamness.Message.resetRulesHeader();

    var header = prefs.getCharPref("extensions.spamness.header");

    var uri = GetLoadedMessage();

    if (uri == null)
	return;

    var hdr = gDBView.msgFolder.GetMessageHeader(gDBView.getKeyAt(gDBView.currentlyDisplayedMessage));

    if (hdr == null || hdr.getStringProperty(header) == null)
	return;

    var parsed = Spamness.parseHeader(hdr.getStringProperty(header));
    var label = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
    document.getElementById("expandedspamness-rulesBox").collapsed = (parsed == null);
    label.setAttribute("flex", "1");
    label.setAttribute("class", "textbox-input spamness-disguise");
    label.setAttribute("readonly", true);
    label.setAttribute("align", "start");
    if (parsed.getRules().length > 0) {
        var rules = parsed.getRules();
        for (var i = 0; i < rules.length; i++) {
            // var url = Spamness.generateRulesURL(rules[i]);
        }
        label.setAttribute("value", rules.join(", "));
    } else {
        label.setAttribute("value", "");
    }
    Spamness.Message.rulesContainer.appendChild(label);
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
    window.removeEventListener('load', Spamness.Message.onLoad, false);
    window.removeEventListener('unload', Spamness.Message.onUnload, false);
};

window.addEventListener("load", Spamness.Message.onLoad, false);
window.addEventListener("unload", Spamness.Message.onUnload, false);
