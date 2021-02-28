/* global ChromeUtils, libCommon, libExperiments */
/* exported scoreColumn */

"use strict";

/* eslint-disable no-var */
var {ExtensionCommon} = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var {ExtensionSupport} = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
/* eslint-enable no-var */

const RspamdSpamnessColumn = {};

// eslint-disable-next-line no-var
var scoreColumn = class extends ExtensionCommon.ExtensionAPI {
    // eslint-disable-next-line class-methods-use-this
    onShutdown(isAppShutdown) {
        if (isAppShutdown) return;

        /*
         * A workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1634348
         * Probably the add-on will be updated. Invalidating the startup cache.
         */
        Services.obs.notifyObservers(null, "startupcache-invalidate");
    }

    getAPI(context) {
        const localStorage = {};

        const window = Services.wm.getMostRecentWindow("mail:3pane");

        const {ExtensionParent} =
            ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
        const extension = ExtensionParent.GlobalManager
            .getExtension("rspamd-spamness@alexander.moisseev");
        Services.scriptloader.loadSubScript(extension.getURL("scripts/libCommon.js"));
        Services.scriptloader.loadSubScript(extension.getURL("experiments/libExperiments.js"));

        RspamdSpamnessColumn.handler = {
            getCellProperties: function () {
                // Do nothing.
            },
            getCellText: function (row) {
                if (localStorage["display-column"] === "image")
                    return null;
                const score = RspamdSpamnessColumn.getScoreByRow(row);
                return (isNaN(score)) ? "" : score.toFixed(2);
            },
            getImageSrc: function (row) {
                if (localStorage["display-column"] === "text")
                    return null;
                const score = RspamdSpamnessColumn.getScoreByRow(row);
                if (localStorage["display-columnImageOnlyForPositive"] && score <= 0)
                    return null;
                return extension.getURL(libCommon.getImageSrc(score));
            },
            getRowProperties: function () {
                // Do nothing.
            },
            getSortLongForRow: function (hdr) {
                return libCommon.getScoreByHdr(hdr, localStorage.header, true) * 1e4 + 1e8;
            },
            getSortStringForRow: function () {
                return null;
            },
            isString: function () {
                return false;
            }
        };

        RspamdSpamnessColumn.getScoreByRow = function (row) {
            return libCommon.getScoreByHdr(window.gDBView.getMsgHdrAt(row), localStorage.header, true);
        };

        RspamdSpamnessColumn.dbObserver = {
            observe: function () {
                RspamdSpamnessColumn.addColumnHandler();
            }
        };

        RspamdSpamnessColumn.addColumnHandler = function () {
            window.gDBView.addColumnHandler("spamScoreCol", RspamdSpamnessColumn.handler);
        };

        context.callOnClose(this);
        return {
            scoreColumn: {
                getCharPref(prefName) {
                    return Services.prefs.getCharPref(prefName);
                },
                init() {
                    // Listen for the main Thunderbird windows opening.
                    ExtensionSupport.registerWindowListener("scoreColumnListener", {
                        chromeURLs: ["chrome://messenger/content/messenger.xhtml"],
                        onLoadWindow({document}) {
                            (function loadCSS() {
                                const href = extension.rootURI.resolve("experiments/scoreColumn.css");

                                const link = document.createElement("link");
                                link.id = "rspamd-spamness-messenger-css";
                                link.rel = "stylesheet";
                                link.href = href;

                                const referenceNode = document.getElementById("tabmail-container");
                                referenceNode.parentNode.insertBefore(link, referenceNode.previousSibling);
                            })();
                            (function addColumn() {
                                const columnId = "spamScoreCol";
                                if (document.getElementById(columnId)) return;

                                const treeCol = document.createXULElement("treecol");
                                treeCol.setAttribute("id", columnId);
                                treeCol.setAttribute("persist", "hidden ordinal sortDirection width");
                                treeCol.classList.add("headerValueBox");
                                treeCol.setAttribute("label", context.extension.localeData
                                    .localizeMessage("spamnessColumn.label"));
                                treeCol.setAttribute("tooltiptext", context.extension.localeData
                                    .localizeMessage("spamnessColumnToolTip.label"));
                                treeCol.setAttribute("width", "60px");

                                const splitter = document.createXULElement("splitter");
                                splitter.setAttribute("id", "spamScoreColSplitter");
                                splitter.classList.add("tree-splitter");
                                splitter.setAttribute("resizeafter", "farthest");
                                splitter.style["-moz-box-ordinal-group"] = 42;

                                const threadCols = document.getElementById("threadCols");
                                const threadCol = document.getElementById("threadCol");
                                threadCols.insertBefore(treeCol, threadCol);
                                threadCols.insertBefore(splitter, threadCol);
                            })();

                            Services.obs.addObserver(RspamdSpamnessColumn.dbObserver, "MsgCreateDBView", false);

                            /*
                             * After add-on installation the observer misses the first notification
                             * since the window is already loaded.
                             */
                            Services.obs.notifyObservers(null, "MsgCreateDBView");
                        }
                    });
                },
                savePrefFile() {
                    Services.prefs.savePrefFile(null);
                },
                setCharPref(prefName, newPref) {
                    Services.prefs.setCharPref(prefName, newPref);
                },
                setLocalStorage(newSettings) {
                    for (const key in newSettings) {
                        if (newSettings[key] === null) delete newSettings[key];
                    }
                    Object.assign(localStorage, newSettings);
                }
            },
        };
    }

    // eslint-disable-next-line class-methods-use-this
    close() {
        libExperiments.removeElements([
            "spamScoreCol",
            "spamScoreColSplitter",
            "rspamd-spamness-messenger-css"
        ]);
        Services.obs.removeObserver(RspamdSpamnessColumn.dbObserver, "MsgCreateDBView", false);
        ExtensionSupport.unregisterWindowListener("scoreColumnListener");
    }
};
