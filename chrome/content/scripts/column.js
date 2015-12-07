var RspamdSpamnessColumn = {};

RspamdSpamnessColumn.handler = {
    getCellText:         function(row, col) {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefBranch);
        var showText = prefs.getIntPref("extensions.rspamd-spamness.display.column");

	if (showText == RspamdSpamness.settings.COLUMN_SHOW_IMAGE_NO_TEXT.value)
	    return null;

        var key = gDBView.getKeyAt(row);
        var hdr = gDBView.db.GetMsgHdrForKey(key);
        var txt = RspamdSpamnessColumn.handler.getSortLongForRow(hdr);
        return (isNaN(txt)) ? "" : txt;
    },

    getSortStringForRow: function(hdr) {
        return null;
    },

    isString:            function() {
        return false;
    },

    getCellProperties:   function(row, col, props) {},

    getRowProperties:    function(row, props) {},

    getImageSrc:         function(row, col) {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefBranch);
        var showImage = prefs.getIntPref("extensions.rspamd-spamness.display.column");

	if (showImage == RspamdSpamness.settings.COLUMN_NO_IMAGE_SHOW_TEXT.value)
	    return null;

        var key = gDBView.getKeyAt(row);
        var hdr = gDBView.db.GetMsgHdrForKey(key);
        var normalized = RspamdSpamnessColumn.handler.getSortLongForRow(hdr);

        return RspamdSpamness.getImageSrc(normalized);
    },

    getSortLongForRow:   function(hdr) {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefBranch);
        var header = prefs.getCharPref("extensions.rspamd-spamness.header").toLowerCase();
        var spamreport = hdr.getStringProperty(header);
	if (spamreport != null) {
            var parsed = RspamdSpamness.parseHeader(spamreport);
	    if (parsed != null) {
		return parsed.getScore();
	    }
	}
	return Number.NaN;
    }
};

RspamdSpamnessColumn.onLoad = function() {
    var ObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    ObserverService.addObserver(RspamdSpamnessColumn.dbObserver, "MsgCreateDBView", false);
};

RspamdSpamnessColumn.dbObserver = {
    observe: function(aMsgFolder, aTopic, aData) {
        RspamdSpamnessColumn.addColumnHandler();
    }
};

RspamdSpamnessColumn.addColumnHandler = function() {
    gDBView.addColumnHandler("spamScoreCol", RspamdSpamnessColumn.handler);
}

window.addEventListener("load", RspamdSpamnessColumn.onLoad, false);
