Spamness.Message = {};

Spamness.Message.container = null;

Spamness.Message.resetHeader = function() {
    Spamness.Message.container.removeChild(Spamness.Message.container.lastChild);
};

Spamness.Message.displayHeader = function() {
    Spamness.Message.container = document.getElementById("spamness-messageHeader-value");
    Spamness.Message.resetHeader();

    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefBranch);
    var showScore = prefs.getBoolPref("extensions.spamness.display.messageScore");
    if (!showScore)
	return;

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
    Spamness.Message.container.appendChild(label);
};

Spamness.Message.onLoad = function() {
    var listener = {};
    listener.onStartHeaders = function() {};
    listener.onEndHeaders = Spamness.Message.displayHeader;
    gMessageListeners.push(listener);
};

Spamness.Message.onUnload = function() {
    window.removeEventListener('load', Spamness.Message.onLoad, false);
    window.removeEventListener('unload', Spamness.Message.onUnload, false);
};

window.addEventListener("load", Spamness.Message.onLoad, false);
window.addEventListener("unload", Spamness.Message.onUnload, false);
