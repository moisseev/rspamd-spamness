var JunkScoreColumn = {};

JunkScoreColumn.handler = {
	getCellText:         function(row, col) {
		var key = gDBView.getKeyAt(row);
		var hdr = gDBView.db.GetMsgHdrForKey(key);
		return hdr.getStringProperty("junkscore")
	},

	getSortStringForRow: function(hdr) {
		return null;
	},

	isString:            function() {
		return false;
	},

	getCellProperties:   function(row, col, props) {},

	getRowProperties:    function(row, props) {},

	getImageSrc:         function(row, col) {},

	getSortLongForRow:   function(hdr) {
		return hdr.getStringProperty("junkscore");
	}
};

JunkScoreColumn.onLoad = function() {
	var ObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
	ObserverService.addObserver(JunkScoreColumn.dbObserver, "MsgCreateDBView", false);
};

JunkScoreColumn.dbObserver = {
	observe: function(aMsgFolder, aTopic, aData) {
		JunkScoreColumn.addColumnHandler();
	}
};

JunkScoreColumn.addColumnHandler = function() {
	gDBView.addColumnHandler("colJunkScore", JunkScoreColumn.handler);
}

window.addEventListener("load", JunkScoreColumn.onLoad, false);

var JunkScoreOriginColumn = {};

JunkScoreOriginColumn.handler = {
	getCellText:         function(row, col) {
		var key = gDBView.getKeyAt(row);
		var hdr = gDBView.db.GetMsgHdrForKey(key);
		return hdr.getStringProperty("junkscoreorigin")
	},

	getSortStringForRow: function(hdr) {
		return hdr.getStringProperty("junkscoreorigin");
	},

	isString:            function() {
		return true;
	},

	getCellProperties:   function(row, col, props) {},

	getRowProperties:    function(row, props) {},

	getImageSrc:         function(row, col) {},

	getSortLongForRow:   function(hdr) {
		return null;
	},
};

JunkScoreOriginColumn.onLoad = function() {
	var ObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
	ObserverService.addObserver(JunkScoreOriginColumn.dbObserver, "MsgCreateDBView", false);
};

JunkScoreOriginColumn.dbObserver = {
	observe: function(aMsgFolder, aTopic, aData) {
		JunkScoreOriginColumn.addColumnHandler();
	}
};

JunkScoreOriginColumn.addColumnHandler = function() {
	gDBView.addColumnHandler("colJunkScoreOrigin", JunkScoreOriginColumn.handler);
}

window.addEventListener("load", JunkScoreOriginColumn.onLoad, false);
