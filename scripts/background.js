/* global browser, libBackground, messenger, messageHeader */

"use strict";

const defaultOptions = {
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
};

function disableSymGroupingMenuitem(group) {
    browser.menus.update("rspamdSpamnessSymbolPopupGroup", {enabled: !group});
    browser.menus.update("rspamdSpamnessSymbolPopupUngroup", {enabled: group});
}
function disableSymOrderMenuitem(order) {
    browser.menus.update("rspamdSpamnessSymbolPopupSortByName", {enabled: (order !== "name")});
    browser.menus.update("rspamdSpamnessSymbolPopupSortByScore", {enabled: (order !== "score")});
}
function groupSymbols(group) {
    disableSymGroupingMenuitem(group);
    browser.popup.disableSymGroupingMenuitem(group);
    browser.storage.local.set({"headers-group_symbols": group});
    messageHeader.updateHeaders();
}
function sortSymbols(order) {
    disableSymOrderMenuitem(order);
    browser.popup.disableSymOrderMenuitem(order);
    browser.storage.local.set({"headers-symbols_order": order});
    messageHeader.updateHeaders();
}

async function moveMessage(buttonId) {
    let ids = [];
    let message = null;
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    if (tabs[0].mailTab) {
        // The tab is a Thunderbird 3-pane tab
        const messageList = await browser.mailTabs.getSelectedMessages();
        if (!messageList.messages.length) return;
        ids = messageList.messages.map((msg) => msg.id);
        [message] = messageList.messages;
    } else {
        // The tab is not a Thunderbird 3-pane tab, presumable a message pane tab
        message = await browser.messageDisplay.getDisplayedMessage(tabs[0].id);
        ids = [message.id];
    }
    const {accountId} = message.folder;
    const trainFolder = {
        rspamdSpamnessButtonHam: "TrainHam",
        rspamdSpamnessButtonSpam: "TrainSpam"
    };
    const {account, path} = await libBackground.getDestination(accountId, trainFolder[buttonId]);
    if (!account) {
        libBackground.displayNotification("spamness.alertText.destinationFolderAccountIsNotSet");
        return;
    }
    if (!path) {
        libBackground.displayNotification("spamness.alertText.destinationFolderLocationIsNotSet");
        return;
    }
    const folders = path.trim().replace(/(^\/|\/$)/g, "").split("/");
    const destination = folders.reduce(function (prev, curr, i, arr) {
        const folder = (i) ? prev.subFolders : prev.folders;
        const subFolder = folder.find((f) => f.name === curr);
        // Break loop by mutating iterated copy
        if (!subFolder) arr.splice(1);
        return subFolder;
    }, account);

    if (typeof destination === "undefined") {
        libBackground.displayNotification("spamness.alertText.destinationFolderNotFound");
        return;
    }

    browser.storage.local.get().then((localStorage) => {
        const action = (buttonId === "rspamdSpamnessButtonHam" &&
                (localStorage["trainingButtonHam-defaultAction"] === "copy") ||
            buttonId === "rspamdSpamnessButtonSpam" &&
                (localStorage["trainingButtonSpam-defaultAction"] === "copy"))
            ? "copy"
            : "move";
        browser.messages[action](ids, destination).catch(function (error) {
            libBackground.error(error);
            if ((/^Unexpected error (copy|mov)ing messages: 2147500037$/).test(error.message)) {
                libBackground.displayNotification(
                    "spamness.alertText.error_2147500037_workaround",
                    error.message + "\n\n"
                );
            }
        });
    });
}
function addTrainButtonsListener(windowId) {
    ["rspamdSpamnessButtonHam", "rspamdSpamnessButtonSpam"]
        .forEach(function (targetId) {
            browser.trainButtons.onButtonCommand.addListener((buttonId) => {
                moveMessage(buttonId);
            }, targetId, windowId);
        });
}
function addTrainButtonsToWindow(window) {
    // Skip popup, devtools, etc.
    if (window.type !== "normal") return;

    browser.trainButtons.addButtonsToWindowById(window.id);
    addTrainButtonsListener(window.id);
}
function addTrainButtonsToNormalWindows() {
    browser.windows.getAll().then((windows) => {
        windows.forEach(function (window) {
            addTrainButtonsToWindow(window);
        });
    });
}

browser.storage.local.get().then((localStorage) => {
    const missing = {};
    for (const k in defaultOptions) {
        if (!Object.prototype.hasOwnProperty.call(localStorage, k)) {
            missing[k] = defaultOptions[k];
            localStorage[k] = defaultOptions[k];
        }
    }
    if (Object.keys(missing).length > 0) browser.storage.local.set(missing);

    libBackground.syncHeaderPrefs(localStorage.header);

    browser.scoreColumn.setLocalStorage({
        "display-column": localStorage["display-column"],
        "display-columnImageOnlyForPositive": localStorage["display-columnImageOnlyForPositive"],
        "header": localStorage.header
    });
    browser.scoreColumn.init();

    if (localStorage["trainingButtons-enabled"]) addTrainButtonsToNormalWindows();

    disableSymGroupingMenuitem(localStorage["headers-group_symbols"]);
    disableSymOrderMenuitem(localStorage["headers-symbols_order"]);

    browser.popup.init(localStorage["headers-symbols_order"], localStorage["headers-group_symbols"]).then(() => {
        browser.popup.onSymbolPopupCommand.addListener(function (id) {
            switch (id) {
            case "copyMenuitem":
                break;
            case "rspamdSpamnessSymbolPopupSortByName":
                sortSymbols("name");
                break;
            case "rspamdSpamnessSymbolPopupSortByScore":
                sortSymbols("score");
                break;
            case "rspamdSpamnessSymbolPopupGroup":
                groupSymbols(true);
                break;
            case "rspamdSpamnessSymbolPopupUngroup":
                groupSymbols(false);
                break;
            case "rspamdSpamnessSymbolPopupOpenRulesDialog":
                libBackground.createPopupWindow("/content/rulesDialog.html", 200, 200);
                break;
            case "rspamdSpamnessSymbolPopupOptions":
                browser.runtime.openOptionsPage();
                break;
            default:
                libBackground.error("Unknown menuitem id: " + id);
            }
        });
    });
});

let lastDisplayedMessageId = null;

browser.mailTabs.onSelectedMessagesChanged.addListener((tab, selectedMessages) => {
    if (selectedMessages.messages.length !== 1) return;
    // The same message was reselected (e.g. after column sorting)
    if (selectedMessages.messages[0].id === lastDisplayedMessageId) return;
    // Hide headers until message is loaded
    ["expandedRspamdSpamnessRow", "expandedRspamdSpamnessRulesRow"].forEach(function (id) {
        browser.spamHeaders.setHeaderHidden(tab.id, id, true);
    });
});

browser.messageDisplay.onMessageDisplayed.addListener((tab, message) => {
    lastDisplayedMessageId = message.id;
    browser.messages.getFull(message.id).then(async (messagepart) => {
        const {headers} = messagepart;
        if (headers) {
            const localStorage = await browser.storage.local.get();
            const headerStr = await libBackground.getHeaderStr(headers);
            messageHeader.displayHeaders(false, tab, message, headers, headerStr, localStorage);
        }
    });
});

browser.runtime.onMessage.addListener(function handleMessage(request, sender, sendResponse) {
    switch (request.method) {
    case "addTrainButtonsToNormalWindows":
        addTrainButtonsToNormalWindows();
        break;
    case "getRulesDialogContent":
        (function () {
            const re = /( +(?:(?:Symbol?: )?[^) ]+\)(?:\[[^\]]*\])?|Message-ID: [^ ]+?))/g;
            const content = messageHeader.headerStr[0].replace(re, "\n$1");
            sendResponse({response: content});
        })();
        break;
    case "syncHeaderPrefs":
        libBackground.syncHeaderPrefs(request.data);
        break;
    default:
        libBackground.error("Unknown request: " + request);
    }
});

browser.windows.onCreated.addListener(async (window) => {
    const localStorage = await browser.storage.local.get();
    if (localStorage["trainingButtons-enabled"]) {
        addTrainButtonsToWindow(window);
    }
});

(function appendPopup() {
    function onCreated() {
        if (browser.runtime.lastError) libBackground.error(browser.runtime.lastError);
    }

    function appendMenuitem(id, label, command) {
        browser.menus.create({
            contexts: ["all"],
            id: id,
            onclick: command,
            title: messenger.i18n.getMessage(label)
        }, onCreated);
    }

    function menuseparator() {
        browser.menus.create({
            contexts: ["all"],
            type: "separator"
        }, onCreated);
    }

    appendMenuitem(
        "rspamdSpamnessSymbolPopupSortByName",
        "spamness.popupSortByName.label",
        () => sortSymbols("name")
    );
    appendMenuitem(
        "rspamdSpamnessSymbolPopupSortByScore",
        "spamness.popupSortByScore.label",
        () => sortSymbols("score")
    );
    menuseparator();
    appendMenuitem(
        "rspamdSpamnessSymbolPopupGroup",
        "spamness.popupGroup.label",
        () => groupSymbols(true)
    );
    appendMenuitem(
        "rspamdSpamnessSymbolPopupUngroup",
        "spamness.popupUngroup.label",
        () => groupSymbols(false)
    );
    menuseparator();
    appendMenuitem(
        "open-rules",
        "spamness.popupRawExtendedHeader.label",
        () => libBackground.createPopupWindow("/content/rulesDialog.html", 200, 200)
    );
    menuseparator();
    appendMenuitem(
        "open-options",
        "spamnessOptions.title",
        () => browser.runtime.openOptionsPage()
    );
}());

browser.spamHeaders.init();
