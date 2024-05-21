/* global browser, libBackground, libOptions, messenger */

"use strict";

let SupernovaCC = null;
let majorVersion = null;
let minorVersion = null;

async function init() {
    // Add timeout to a promise
    function promiseTimeout(promise, timeout, exception) {
        let timer = null;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(exception), timeout);
        });
        return Promise.race([promise, timeoutPromise])
            .finally(() => clearTimeout(timer));
    }

    const timeoutError = Symbol("promise timeout");
    try {
        // In Thunderbird 78, the promise never resolves in this script but works in background.js
        const browserInfo = await promiseTimeout(messenger.runtime.getBrowserInfo(), 100, timeoutError);
        [majorVersion, minorVersion] = browserInfo.version.split(".", 2).map((v) => parseInt(v, 10));
        // Thunderbird Supernova with custom column handlers support
        SupernovaCC = majorVersion > 115 || (majorVersion === 115 && minorVersion >= 10);
    } catch (e) {
        if (e === timeoutError) {
            libBackground.error("Timeout occurred while fetching browser info.");
        } else {
            // Throw other errors
            throw e;
        }
    }

    if (SupernovaCC) {
        document.querySelector("#column-display-note-cc").removeAttribute("hidden");
    } else if (majorVersion > 110) {
        document.querySelector("#column-display-fieldset").disabled = true;
        document.querySelector("#column-display-note").removeAttribute("hidden");
    }

    const localStorage = await browser.storage.local.get(libBackground.defaultOptions.keys);

    document.querySelector("#columnDisplay_" + localStorage["display-column"]).checked = true;
    document.querySelector("#columnImageOnlyForPositive").checked = localStorage["display-columnImageOnlyForPositive"];

    document.querySelector("#messageScore").checked = localStorage["display-messageScore"];
    document.querySelector("#messageRules").checked = localStorage["display-messageRules"];
    document.querySelector("#show_n_lines").value = localStorage["headers-show_n_lines"];
    document.querySelector("#colorizeSymbols").checked = localStorage["headers-colorizeSymbols"];

    document.querySelector("#trainingButtons-enabled").checked = localStorage["trainingButtons-enabled"];
    document.querySelector("#folderTrainHam").value = localStorage.folderTrainHam;
    document.querySelector("#folderTrainSpam").value = localStorage.folderTrainSpam;

    document.querySelector("#trainingButtonHamDefaultAction").value = localStorage["trainingButtonHam-defaultAction"];
    document.querySelector("#trainingButtonSpamDefaultAction").value = localStorage["trainingButtonSpam-defaultAction"];

    libOptions.populateSelect("#defaultTrainingFolderAccount", localStorage.defaultTrainingFolderAccount);
}

async function saveOptions(e) {
    e.preventDefault();

    const localStorage = await browser.storage.local.get(libBackground.defaultOptions.keys);

    /* eslint-disable sort-keys */
    browser.storage.local.set({
        "display-column": document.querySelector("input[name='columnDisplay']:checked").value,
        "display-columnImageOnlyForPositive": document.querySelector("#columnImageOnlyForPositive").checked,

        "display-messageScore": document.querySelector("#messageScore").checked,
        "display-messageRules": document.querySelector("#messageRules").checked,
        "headers-show_n_lines": document.querySelector("#show_n_lines").value,
        "headers-colorizeSymbols": document.querySelector("#colorizeSymbols").checked,

        "trainingButtons-enabled": document.querySelector("#trainingButtons-enabled").checked,
        "defaultTrainingFolderAccount": document.getElementById("defaultTrainingFolderAccount").value,
        "folderTrainHam": document.querySelector("#folderTrainHam").value,
        "folderTrainSpam": document.querySelector("#folderTrainSpam").value,

        "trainingButtonHam-defaultAction": document.querySelector("#trainingButtonHamDefaultAction").value,
        "trainingButtonSpam-defaultAction": document.querySelector("#trainingButtonSpamDefaultAction").value
    });
    /* eslint-enable sort-keys */

    (await messenger.runtime.getBackgroundPage()).messenger.scoreColumn.setLocalStorage({
        "display-column": document.querySelector("input[name='columnDisplay']:checked").value,
        "display-columnImageOnlyForPositive": document.querySelector("#columnImageOnlyForPositive").checked
    });

    if (SupernovaCC &&
        localStorage["display-columnImageOnlyForPositive"] !==
        document.querySelector("#columnImageOnlyForPositive").checked)
        browser.scoreColumn.refreshCustomColumn("spamIconCol");

    if (!localStorage["trainingButtons-enabled"] && document.querySelector("#trainingButtons-enabled").checked) {
        browser.runtime.sendMessage({method: "addTrainButtonsToNormalWindows"});
    } else if (localStorage["trainingButtons-enabled"] && !document.querySelector("#trainingButtons-enabled").checked) {
        (await messenger.runtime.getBackgroundPage()).messenger.trainButtons.removeButtons();
    }
}

document.querySelector("#account-options-button").addEventListener("click", function () {
    libBackground.createPopupWindow("/options/account-options.html", 891, 612);
});
document.querySelector("#advanced-options-button").addEventListener("click", function () {
    libBackground.createPopupWindow("/options/advancedOptions.html");
});
document.addEventListener("DOMContentLoaded", init);
document.querySelector("form").addEventListener("submit", saveOptions);
