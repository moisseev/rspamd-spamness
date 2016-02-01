var RspamdSpamnessColumn = {};

RspamdSpamnessColumn.handler = {
    getCellText:         function(row, col) {
	if (prefs.getIntPref("extensions.rspamd-spamness.display.column") == 2)
	    return null;

        var score = RspamdSpamnessColumn.getScoreByRow(row);
        return (isNaN(score)) ? "" : score;
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
	if (prefs.getIntPref("extensions.rspamd-spamness.display.column") == 1)
	    return null;

        var score = RspamdSpamnessColumn.getScoreByRow(row);
        return RspamdSpamness.getImageSrc(score);
    },

    getSortLongForRow:   function(hdr) {
        return RspamdSpamnessColumn.getScoreByHdr(hdr) * 1e4 + 1e8;
    }
};

RspamdSpamnessColumn.getScoreByRow = function(row) {
    var key = gDBView.getKeyAt(row);
    var hdr = gDBView.db.GetMsgHdrForKey(key);
    return RspamdSpamnessColumn.getScoreByHdr(hdr);
};

RspamdSpamnessColumn.getScoreByHdr = function(hdr) {
    var re = /: False \[([-\d\.]+) \/ [-\d\.]+\] */;
    var headerStr = RspamdSpamness.getHeaderStr(hdr);
    return (headerStr)
        ? parseFloat(re.exec(headerStr)[1])
        : Number.NaN;
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
