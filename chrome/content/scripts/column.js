/* global RspamdSpamness:false */

"use strict";

const RspamdSpamnessColumn = {};

RspamdSpamnessColumn.handler = {
    getCellProperties: function () {
        // Do nothing.
    },
    getCellText: function (row) {
        if (Services.prefs.getIntPref("extensions.rspamd-spamness.display.column") === 2)
            return null;
        const score = RspamdSpamnessColumn.getScoreByRow(row);
        return (isNaN(score)) ? "" : score.toFixed(2);
    },
    getImageSrc: function (row) {
        if (Services.prefs.getIntPref("extensions.rspamd-spamness.display.column") === 1)
            return null;
        const score = RspamdSpamnessColumn.getScoreByRow(row);
        if (Services.prefs.getBoolPref("extensions.rspamd-spamness.display.columnImageOnlyForPositive") && score <= 0)
            return null;
        return RspamdSpamness.getImageSrc(score);
    },
    getRowProperties: function () {
        // Do nothing.
    },
    getSortLongForRow: function (hdr) {
        return RspamdSpamness.getScoreByHdr(hdr) * 1e4 + 1e8;
    },
    getSortStringForRow: function () {
        return null;
    },
    isString: function () {
        return false;
    }
};

RspamdSpamnessColumn.getScoreByRow = function (row) {
    return RspamdSpamness.getScoreByHdr(gDBView.getMsgHdrAt(row));
};

RspamdSpamnessColumn.onLoad = function () {
    Services.obs.addObserver(RspamdSpamnessColumn.dbObserver, "MsgCreateDBView", false);
};

RspamdSpamnessColumn.dbObserver = {
    observe: function () {
        RspamdSpamnessColumn.addColumnHandler();
    }
};

RspamdSpamnessColumn.addColumnHandler = function () {
    gDBView.addColumnHandler("spamScoreCol", RspamdSpamnessColumn.handler);
};

RspamdSpamnessColumn.onUnload = function () {
    Services.obs.removeObserver(RspamdSpamnessColumn.dbObserver, "MsgCreateDBView", false);
    window.removeEventListener("load", RspamdSpamnessColumn.onLoad, false);
    window.removeEventListener("unload", RspamdSpamnessColumn.onUnload, false);
};

window.addEventListener("load", RspamdSpamnessColumn.onLoad, false);
window.addEventListener("unload", RspamdSpamnessColumn.onUnload, false);
