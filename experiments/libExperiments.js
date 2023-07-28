/* global Services, majorVersion */

"use strict";

// eslint-disable-next-line no-var
var libExperiments = {};

libExperiments.getContentWindow = function (window, tabIndex) {
    if (majorVersion < 111) return window;

    if (window.gTabmail) {
        const tab = window.gTabmail.tabInfo[tabIndex];
        return tab.mode.name === "mail3PaneTab"
            ? tab.chromeBrowser.contentWindow.messageBrowser.contentWindow
            : tab.chromeBrowser.contentWindow;
    } else if (window.messageBrowser) {
        return window.messageBrowser.contentWindow;
    }
    throw Error("Could not find the XUL <browser> object");
};

libExperiments.getDocumentByTabIndex = function (windowId, tabIndex) {
    const window = Services.wm.getOuterWindowWithId(windowId);
    return libExperiments.getContentWindow(window, tabIndex).document;
};

libExperiments.removeElements = function (elements, resetHeaderHeight) {
    function removeElementById(id, window, tabIndex) {
        const element = libExperiments.getContentWindow(window, tabIndex).document
            .getElementById(id);
        if (element) element.remove();
    }

    ["mail:3pane", "mail:messageWindow"].forEach((windowType) => {
        for (const window of Services.wm.getEnumerator(windowType)) {
            elements.forEach(function (id) {
                if (window.gTabmail) {
                    window.gTabmail.tabInfo.forEach((tab, tabIndex) => {
                        if (["mail3PaneTab", "mailMessageTab"].some((n) => n === tab.mode.name)) {
                            removeElementById(id, window, tabIndex);
                        }
                    });
                } else {
                    removeElementById(id, window);
                }
            });
            if (resetHeaderHeight) window.document.getElementById("expandedHeaderView").removeAttribute("height");
        }
    });
};
