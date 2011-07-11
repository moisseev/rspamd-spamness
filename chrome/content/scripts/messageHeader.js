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
    var hdrEl = document.getElementById("expandedSpamnessRulesBox");
    if (!showRules) {
        rowEl.collapsed = true;
        return;
    } else {
        if (hdrEl.clearHeaderValues)
            hdrEl.clearHeaderValues();
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
    var rules = parsed.getRules();
    if (parsed != null && rules.length > 0) {
        for (var i = 0; i < rules.length; i++) {
            var link = {};
            link.displayText = rules[i];
            link.url = Spamness.generateRulesURL(rules[i]);
            hdrEl.addLinkView(link);
        }
    } else {
        hdrEl.headerValue = "";
    }

    hdrEl.valid = true;
    hdrEl.buildViews();
};

Spamness.Message.handleOpenLink = function(linkNode) {
};

Spamness.Message.copyLink = function(linkNode) {
    if (linkNode) {
        var url = linkNode.getAttribute('url');
        var contractid = "@mozilla.org/widget/clipboardhelper;1";
        var iid = Components.interfaces.nsIClipboardHelper;
        var clipboard = Components.classes[contractid].getService(iid);
        clipboard.copyString(url);
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
