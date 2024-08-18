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

    document.querySelector("#serverBaseUrl").value = localStorage.serverBaseUrl;
    document.querySelector("#serverPassword").value = localStorage.serverPassword;

    document.querySelector("#fuzzyFlagHam").value = localStorage.fuzzyFlagHam;
    document.querySelector("#fuzzyWeightHam").value = localStorage.fuzzyWeightHam;
    document.querySelector("#fuzzyFlagSpam").value = localStorage.fuzzyFlagSpam;
    document.querySelector("#fuzzyWeightSpam").value = localStorage.fuzzyWeightSpam;

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

        "serverBaseUrl": document.querySelector("#serverBaseUrl").value,
        "serverPassword": document.querySelector("#serverPassword").value,

        "fuzzyFlagHam": document.querySelector("#fuzzyFlagHam").value,
        "fuzzyWeightHam": document.querySelector("#fuzzyWeightHam").value,
        "fuzzyFlagSpam": document.querySelector("#fuzzyFlagSpam").value,
        "fuzzyWeightSpam": document.querySelector("#fuzzyWeightSpam").value,

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
        browser.scoreColumn.refreshCustomColumn("spamnessIconCol");

    if (!localStorage["trainingButtons-enabled"] && document.querySelector("#trainingButtons-enabled").checked) {
        browser.runtime.sendMessage({method: "addTrainButtonsToNormalWindows"});
    } else if (localStorage["trainingButtons-enabled"] && !document.querySelector("#trainingButtons-enabled").checked) {
        (await messenger.runtime.getBackgroundPage()).messenger.trainButtons.removeButtons();
    }
}

function isValidUrl(url) {
    try {
        // eslint-disable-next-line no-new
        new URL(url);
        return true;
    // eslint-disable-next-line no-unused-vars
    } catch (_) {
        return false;
    }
}

function urlInputFeedback(isValid) {
    const urlInput = document.querySelector("#serverBaseUrl");
    if (isValid) {
        urlInput.classList.remove("input-invalid");
    } else {
        urlInput.classList.add("input-invalid");
    }
}

let abortController = new AbortController();

async function checkServerStatus() {
    const loadingSpinner = document.querySelector("#loading-spinner");
    const serverBaseUrl = document.querySelector("#serverBaseUrl").value;
    const serverPassword = document.querySelector("#serverPassword").value;

    function updateStatusMessage(messageName, dynamicText, color = "red") {
        const statusMessageElement = document.querySelector("#server-status-message");

        let message = messageName ? browser.i18n.getMessage(messageName) : "";
        if (dynamicText) message += ` ${dynamicText}`;

        statusMessageElement.textContent = message;
        statusMessageElement.style.color = color;
    }

    if (!isValidUrl(serverBaseUrl)) {
        updateStatusMessage("spamnessOptions.statusMessage.invalidUrl");
        return;
    }

    updateStatusMessage();
    loadingSpinner.classList.remove("spinner-hidden");
    document.querySelector("#check-server-status-button").disabled = true;

    abortController = new AbortController();
    const {signal} = abortController;

    try {
        const pingResponse = await fetch(`${serverBaseUrl}/ping`, {signal});
        if (!pingResponse.ok || await pingResponse.text() !== "pong\r\n") {
            updateStatusMessage(
                "spamnessOptions.statusMessage.pingFailed",
                `${pingResponse.status} ${pingResponse.statusText}`
            );
        } else {
            const statResponse = await fetch(`${serverBaseUrl}/stat`, {headers: {Password: serverPassword}, signal});
            if (statResponse.ok) {
                const statData = await statResponse.json();
                updateStatusMessage(
                    `spamnessOptions.statusMessage.serverIs${statData.read_only ? "ReadOnly" : "Writable"}`,
                    "",
                    statData.read_only ? "orange" : "green"
                );
            } else {
                updateStatusMessage(
                    "spamnessOptions.statusMessage.serverStatus",
                    `${statResponse.status} ${statResponse.statusText}`
                );
            }
        }
    } catch (error) {
        if (error.message.includes("NetworkError") && await fetchWithNoCorsCheck()) {
            updateStatusMessage("spamnessOptions.statusMessage.corsError");
        } else if (error.name === "AbortError") {
            updateStatusMessage("spamnessOptions.statusMessage.requestCancelled", "", "orange");
        } else {
            updateStatusMessage("spamnessOptions.statusMessage.errorCheckingServer", `${error.message}`);
        }
    } finally {
        loadingSpinner.classList.add("spinner-hidden");
        document.querySelector("#check-server-status-button").disabled = false;
    }

    async function fetchWithNoCorsCheck() {
        try {
            await fetch(`${serverBaseUrl}/ping`, {mode: "no-cors"});
            return true;
        // eslint-disable-next-line no-unused-vars
        } catch (_) {
            return false;
        }
    }
}

function handleInputChange() {
    if (abortController) abortController.abort();
}
document.querySelector("#serverBaseUrl").addEventListener("input", handleInputChange);
document.querySelector("#serverPassword").addEventListener("input", handleInputChange);

document.querySelector("#check-server-status-button").addEventListener("click", checkServerStatus);

document.querySelector("#account-options-button").addEventListener("click", function () {
    libBackground.createPopupWindow("/options/account-options.html", 891, 612);
});
document.querySelector("#advanced-options-button").addEventListener("click", function () {
    libBackground.createPopupWindow("/options/advancedOptions.html");
});
document.querySelector("#serverBaseUrl").addEventListener("input", (e) => urlInputFeedback(isValidUrl(e.target.value)));
document.addEventListener("DOMContentLoaded", init);
document.querySelector("form").addEventListener("submit", saveOptions);
