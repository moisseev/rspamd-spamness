/* global browser, libCommon */

"use strict";

const libBackground = {
    defaultOptions: {
        "defaultTrainingFolderAccount": "",
        "display-column": "both",
        "display-columnImageOnlyForPositive": false,
        "display-messageRules": true,
        "display-messageScore": true,
        "header": "",
        "headers-colorizeSymbols": true,
        "headers-group_symbols": true,
        "headers-show_n_lines": "3",
        "headers-symbols_order": "score",
        "trainingButtonHam-defaultAction": "move",
        "trainingButtonSpam-defaultAction": "move",
        "trainingButtons-enabled": true
    }
};

libBackground.createPopupWindow = function (url, width = 480, height = 300) {
    const {messenger} = window.browser.extension.getBackgroundPage();
    messenger.windows.create({
        allowScriptsToClose: true,
        height: height,
        type: "popup",
        url: url,
        width: width
    });
};

libBackground.displayNotification = function (messageName, string = "") {
    browser.notifications.create({
        iconUrl: browser.extension.getURL("images/icon.svg"),
        message: string + browser.i18n.getMessage(messageName),
        title: "Rspamd-spamness",
        type: "basic"
    });
};

libBackground.getDestination = async function (accountId, folder) {
    const accountKey = accountId + "-account" + folder;
    let folderKey = accountId + "-folder" + folder;
    let isDefault = false;
    const localStorage = await browser.storage.local.get([accountKey, "defaultTrainingFolderAccount"]);
    const account = localStorage[accountKey];
    const defaultTrainingFolderAccount = await browser.accounts.get(localStorage.defaultTrainingFolderAccount);

    // Use default folder if account preference doesn't exist
    if (!account) {
        folderKey = "folder" + folder;
        isDefault = true;
    }

    const path = (await browser.storage.local.get(folderKey))[folderKey];
    return {
        account: account
            ? await browser.accounts.get(account)
            : defaultTrainingFolderAccount,
        defaultTrainingFolderAccount: defaultTrainingFolderAccount,
        isDefault: isDefault,
        path: path || ""
    };
};

libBackground.getHeaderStr = async function (headers) {
    let headerStr = null;
    const {header} = await browser.storage.local.get("header");
    const userHeaders = await libCommon.getUserHeaders(header);
    userHeaders.some(function (headerName) {
        if (!headerName) return false;
        headerStr = headers[headerName];
        return ((/: \S+ \[[-\d.]+ \/ [-\d.]+\]/).test(headerStr));
    });
    return headerStr || headers["x-spamd-result"] || null;
};

libBackground.syncHeaderPrefs = async function (prefVal) {
    const customHeaders = await getHeadersPref("mailnews.customHeaders", /\s*:\s*/);
    const {header} = await browser.storage.local.get("header");
    const curUserHeaders = libCommon.getUserHeaders(header);
    const newUserHeaders = prefVal.toLowerCase().split(/, */);

    if (prefVal !== "") {
        const valid = newUserHeaders.every(function (h) {
            return isRFC5322HeaderName(h);
        });
        if (!valid) {
            showAlert("spamness.alertText.colonInHeaderName");
            return Promise.reject(new Error("Invalid character in header name."));
        }
    }

    const newHeaders = [...libCommon.scoreHeaders, ...newUserHeaders];
    setHeadersPref("mailnews.customHeaders", customHeaders, ": ", curUserHeaders, newHeaders);

    const setting = {header: newUserHeaders.join(", ")};
    await browser.storage.local.set(setting);
    browser.scoreColumn.setLocalStorage(setting);

    // flush to disk
    browser.scoreColumn.savePrefFile();
    return Promise.resolve();

    async function getHeadersPref(prefName, separator) {
        let chdrs = await browser.scoreColumn.getCharPref(prefName);
        chdrs = chdrs.trim();
        return (chdrs === "")
            ? []
            : chdrs.split(separator);
    }

    function isRFC5322HeaderName(str) {
        return (/^[\x21-\x39\x3B-\x7E]+$/).test(str);
    }

    function setHeadersPref(prefName, arr, separator, rmvHeaders, addHeaders) {
        const h = {
            add: addHeaders,
            rmv: rmvHeaders
        };
        let modified = null;
        if (typeof h.rmv === "string")
            h.rmv = [h.rmv];
        if (typeof h.add === "string")
            h.add = [h.add];

        h.rmv.forEach(function (hdr) {
            const i = arr.indexOf(hdr);
            if (i >= 0 && h.add.indexOf(hdr) === -1) {
                arr.splice(i, 1);
                modified = true;
            }
        });
        h.add.forEach(function (hdr) {
            // Skip empty strings
            if (!hdr) return;
            if (arr.indexOf(hdr) === -1) {
                arr.push(hdr);
                modified = true;
            }
        });
        if (modified) {
            const newPref = arr.join(separator);
            browser.scoreColumn.setCharPref(prefName, newPref);
        }
    }

    function showAlert(messageName) {
        window.alert(browser.i18n.getMessage(messageName));
        const prefEl = document.getElementById("headerNameForm");
        if (prefEl) prefEl.focus();
    }
};


libBackground.error = function (msg) {
    // eslint-disable-next-line no-console
    console.error(msg);
};
