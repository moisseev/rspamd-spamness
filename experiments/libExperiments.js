/* global Services */

"use strict";

// eslint-disable-next-line no-var
var libExperiments = {};

libExperiments.removeElements = function (elements) {
    for (const window of Services.wm.getEnumerator("mail:3pane")) {
        elements.forEach(function (id) {
            const element = window.document.getElementById(id);
            if (element) {
                element.remove();
            }
        });
    }
};
