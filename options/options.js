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

    // Validate all fields before saving
    const validations = [
        {id: "serverBaseUrl", validator: validateUrl},
        {id: "show_n_lines", validator: validateNonNegativeInteger},
        {id: "fuzzyFlagHam", validator: validatePositiveInteger},
        {id: "fuzzyFlagSpam", validator: validatePositiveInteger},
        {id: "fuzzyWeightHam", validator: validateNumber},
        {id: "fuzzyWeightSpam", validator: validateNumber}
    ];

    let hasErrors = false;
    validations.forEach(({id, validator}) => {
        const inputElement = document.querySelector(`#${id}`);
        const validation = validator(inputElement.value, inputElement);
        updateValidationUI(id, validation);
        if (!validation.valid) hasErrors = true;
    });

    if (hasErrors) return;

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

function validateUrl(url) {
    if (!url || url.trim() === "") {
        return {valid: true};
    }
    try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
            return {
                error: browser.i18n.getMessage("spamnessOptions.validation.notHttpProtocol"),
                valid: false
            };
        }
        return {valid: true};
    // eslint-disable-next-line no-unused-vars
    } catch (_) {
        return {
            error: browser.i18n.getMessage("spamnessOptions.statusMessage.invalidUrl"),
            valid: false
        };
    }
}

function validationResult(isValid, messageKey = null) {
    return isValid
        ? {valid: true}
        : {error: browser.i18n.getMessage(messageKey), valid: false};
}

function validateNumericField(value, inputElement, messageKey, options) {
    const {allowEmpty, checkValue, parseFunc} = options;

    if (inputElement && inputElement.validity.badInput) return validationResult(false, messageKey);
    if (!value || value.trim() === "") return validationResult(allowEmpty, messageKey);

    const num = parseFunc(value, 10);
    if (!checkValue(num, value.trim())) return validationResult(false, messageKey);

    return validationResult(true);
}

function validateNonNegativeInteger(value, inputElement) {
    return validateNumericField(
        value,
        inputElement,
        "spamnessOptions.validation.nonNegativeInteger",
        {
            allowEmpty: false,
            checkValue: (num, str) => !isNaN(num) && num >= 0 && num.toString() === str,
            parseFunc: parseInt
        }
    );
}

function validatePositiveInteger(value, inputElement) {
    return validateNumericField(
        value,
        inputElement,
        "spamnessOptions.validation.positiveInteger",
        {
            allowEmpty: true,
            checkValue: (num, str) => !isNaN(num) && num >= 1 && num.toString() === str,
            parseFunc: parseInt
        }
    );
}

function validateNumber(value, inputElement) {
    return validateNumericField(
        value,
        inputElement,
        "spamnessOptions.validation.validNumber",
        {
            allowEmpty: true,
            checkValue: (num) => !isNaN(num),
            parseFunc: parseFloat
        }
    );
}

function updateValidationUI(inputId, validation) {
    const input = document.querySelector(`#${inputId}`);
    const errorSpan = document.querySelector(`#${inputId}-error`);
    const saveButton = document.querySelector("form button[type='submit']");

    if (validation.valid) {
        input.classList.remove("invalid");
        if (errorSpan) {
            errorSpan.style.display = "none";
            errorSpan.textContent = "";
        }
    } else {
        input.classList.add("invalid");
        if (errorSpan) {
            errorSpan.textContent = validation.error;
            errorSpan.style.display = "block";
        }
    }

    // Check if any field is invalid
    const hasInvalidFields = document.querySelectorAll("input.invalid").length > 0;
    if (saveButton) saveButton.disabled = hasInvalidFields;
}

function updateUrlValidationUI(validation) {
    updateValidationUI("serverBaseUrl", validation);
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

    const urlValidation = validateUrl(serverBaseUrl);
    if (!urlValidation.valid) {
        updateStatusMessage(null, urlValidation.error);
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

// Field validation configuration
const numericFieldValidations = [
    {id: "show_n_lines", validator: validateNonNegativeInteger},
    {id: "fuzzyFlagHam", validator: validatePositiveInteger},
    {id: "fuzzyFlagSpam", validator: validatePositiveInteger},
    {id: "fuzzyWeightHam", validator: validateNumber},
    {id: "fuzzyWeightSpam", validator: validateNumber}
];

function validateFieldById(id, validator) {
    const inputElement = document.querySelector(`#${id}`);
    const validation = validator(inputElement.value, inputElement);
    updateValidationUI(id, validation);
}

// Real-time validation
document.querySelector("#serverBaseUrl").addEventListener("input", (e) => {
    const validation = validateUrl(e.target.value);
    updateUrlValidationUI(validation);
});

numericFieldValidations.forEach(({id, validator}) => {
    document.querySelector(`#${id}`).addEventListener("input", () => validateFieldById(id, validator));
});

// Validate on save button hover
document.addEventListener("DOMContentLoaded", () => {
    const saveButton = document.querySelector("form button[type='submit']");
    if (saveButton) {
        saveButton.addEventListener("mouseenter", () => {
            const urlValidation = validateUrl(document.querySelector("#serverBaseUrl").value);
            updateUrlValidationUI(urlValidation);

            numericFieldValidations.forEach(({id, validator}) => validateFieldById(id, validator));
        });
    }
});

document.addEventListener("DOMContentLoaded", init);
document.querySelector("form").addEventListener("submit", saveOptions);
