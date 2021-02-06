"use strict";

const libPopup = {};

libPopup.closeWindow = function (e) {
    e.preventDefault();
    window.close();
};

window.focus();
window.onkeydown = function (event) {
    if (event.key === "Escape") {
        window.close();
    }
};
