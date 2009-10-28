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
    var label = document.createElement("label");
    if (parsed != null) {
        label.setAttribute("value", parsed.getNormalScore());
        label.setAttribute("title", parsed.getScore() + " / " + parsed.getThreshold());
        // set class for styling
    } else {
	label.setAttribute("value", "Unrated"); // replace with string bundle
	// set class for styling
    }
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
