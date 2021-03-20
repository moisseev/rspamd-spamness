/* global Services */

"use strict";

// eslint-disable-next-line no-var
var libExperiments = {};

libExperiments.removeElements = function (elements, resetHeaderHeight) {
    ["mail:3pane", "mail:messageWindow"].forEach((windowType) => {
        for (const window of Services.wm.getEnumerator(windowType)) {
            elements.forEach(function (id) {
                const element = window.document.getElementById(id);
                if (element) {
                    element.remove();
                }
            });
            if (resetHeaderHeight) window.document.getElementById("expandedHeaderView").removeAttribute("height");
        }
    });
};
