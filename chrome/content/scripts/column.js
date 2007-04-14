var SpamnessColumn = {};

SpamnessColumn.handler = {
	getCellText:         function(row, col) {
		var key = gDBView.getKeyAt(row);
		var hdr = gDBView.db.GetMsgHdrForKey(key);
		var txt = SpamnessColumn.handler.getSortLongForRow(hdr) / 10.0;
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
		var key = gDBView.getKeyAt(row);
		var hdr = gDBView.db.GetMsgHdrForKey(key);
		var normalized = SpamnessColumn.handler.getSortLongForRow(hdr) / 10.0;
		var img;
		if (isNaN(normalized)) {
			img = "chrome://messenger/skin/icons/symbol-null.png";
		} else if (normalized < 0) {
			level = Math.round(Math.log(Math.abs(normalized) + 1));
			level = (level >= 5) ? 4 : level;
			img = "chrome://spamness/skin/ham" + level + ".png";
		} else {
			level = Math.round(Math.log(normalized + 1));
			level = (level >= 5) ? 4 : level;
			img = "chrome://spamness/skin/spam" + level + ".png";
		}
		return img;
	},

	getSortLongForRow:   function(hdr) {
		var spamreport = hdr.getStringProperty("x-spam-status");
		//dump("report: " + spamreport);

		var scoreprefix = "score=";
		var scoreIdx = spamreport.indexOf("score=");
		if (scoreIdx < 0) {
			scoreprefix = "hits=";
			scoreIdx = spamreport.indexOf("hits=");
		}
		var endScoreIdx = spamreport.indexOf(" ", scoreIdx);
		var score = parseFloat(spamreport.substring(scoreIdx + scoreprefix.length, endScoreIdx));
		//dump("score: " + score);

		var threshIdx = spamreport.indexOf("required=");
		var endThreshIdx = spamreport.indexOf(" ", threshIdx);
		if (endThreshIdx <  0) {
			var lines = spamreport.split(/\n/);
			endThreshIdx = lines[0].length - 1;
		}
		var thresh = parseFloat(spamreport.substring(threshIdx + "required=".length, endThreshIdx));
		//dump("thresh: " + thresh);

		return Math.round((score - thresh) * 100) / 10.0;
	}
};

SpamnessColumn.onLoad = function() {
	var ObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
	ObserverService.addObserver(SpamnessColumn.dbObserver, "MsgCreateDBView", false);
};

SpamnessColumn.dbObserver = {
	observe: function(aMsgFolder, aTopic, aData) {
		SpamnessColumn.addColumnHandler();
	}
};

SpamnessColumn.addColumnHandler = function() {
	gDBView.addColumnHandler("colSpamStatus", SpamnessColumn.handler);
}

window.addEventListener("load", SpamnessColumn.onLoad, false);
