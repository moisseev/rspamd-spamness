/* global browser, libCommon, libPopup */

"use strict";

function saveOptions(e) {
    e.preventDefault();

    browser.runtime.sendMessage({
        data: document.getElementById("headerNameForm").value,
        method: "syncHeaderPrefs"
    }).then(function () {
        window.close();
    });
}

function restoreOptions() {
    browser.storage.local.get().then((res) => {
        document.getElementById("headerNameForm").value = res.header.toLowerCase();
        document.getElementById("scoreHeaders").textContent = libCommon.scoreHeaders.join(", ");
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.querySelector("form").addEventListener("reset", libPopup.closeWindow);
