/* global browser, libBackground, libHeader, messenger, messageHeader */

"use strict";

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

async function sendMessageToRspamd(message, buttonId, action) {
    const localStorage = await browser.storage.local.get([
        "fuzzyFlagHam",
        "fuzzyWeightHam",
        "fuzzyFlagSpam",
        "fuzzyWeightSpam",
        "serverPassword",
        "serverBaseUrl"
    ]);

    if (!localStorage.serverBaseUrl) {
        libBackground.displayNotification(
            "spamnessOptions.serverBaseUrl.label",
            browser.i18n.getMessage("spamness.alertText.pleaseConfigure")
        );
        return;
    }

    const hamSpam = (buttonId === "rspamdSpamnessButtonHam") ? "Ham" : "Spam";

    const headers = new Headers();

    if (action === "fuzzy") {
        const flag = localStorage[`fuzzyFlag${hamSpam}`];
        if (!flag) {
            libBackground.displayNotification(
                "spamness.alertText.trainingAborted",
                browser.i18n.getMessage("spamness.alertText.missingFlagFor") + hamSpam + "."
            );
            // Abort training
            return;
        }
        headers.append("Flag", flag);

        const weight = localStorage[`fuzzyWeight${hamSpam}`];
        if (weight) headers.append("Weight", weight);
    }

    if (localStorage.serverPassword) headers.append("Password", localStorage.serverPassword);

    const endpoint = {
        bayes: "/learn" + hamSpam.toLowerCase(),
        check: "/checkv2",
        fuzzy: "/fuzzyadd"
    };

    try {
        const serverUrl = new URL(endpoint[action], localStorage.serverBaseUrl);
        const file = await browser.messages.getRaw(message.id);

        const response = await fetch(serverUrl, {
            body: file,
            headers: headers,
            method: "POST",
        });

        if (response.ok) {
            if (response.status === 200) {
                if (action === "check") {
                    const {symbols} = await response.json();
                    const filteredKeys = Object.keys(symbols).filter((s) => (/(BAYES_|FUZZY_)/).test(s)).sort();
                    const msg = filteredKeys.reduce((prev, k) => {
                        const s = symbols[k];
                        return prev + s.name + "(" + s.score.toFixed(2) + ")[" + s.options[0] + "]\n";
                    }, "");
                    libBackground.displayNotification(null, msg, "info");
                } else {
                    libBackground.displayNotification(
                        null,
                        browser.i18n.getMessage("spamness.alertText.messageTrainedAs") + hamSpam,
                        "info"
                    );
                }
            } else {
                libBackground.displayNotification(null, `Status: ${response.status}\n${response.statusText}`, "info");
            }
        } else {
            libBackground.displayNotification(null, `Status: ${response.status}\n${response.statusText}`);
        }
    } catch (e) {
        libBackground.displayNotification("spamness.alertText.failedToSendRequestToRspamd", e.message);
    }
}

async function moveMessage(buttonId, windowId, tabIndex, selectedAction) {
    // eslint-disable-next-line no-useless-assignment
    let ids = [];
    // eslint-disable-next-line no-useless-assignment
    let message = null;
    const tabs = await browser.tabs.query({active: true, currentWindow: true});

    // A Thunderbird 3-pane tab or context menu
    if (windowId === "contextMenuPopup" || tabs[0].mailTab && tabs[0].type === "normal") {
        const messageList = await browser.mailTabs.getSelectedMessages();
        if (!messageList.messages.length) return;
        ids = messageList.messages.map((msg) => msg.id);
        [message] = messageList.messages;

    // A message pane tab or message display window
    } else {
        const window = await browser.windows.get(windowId, {populate: true});
        const tabId = (window.type === "messageDisplay") ? window.tabs[tabIndex].id : tabs[0].id;
        message = await browser.messageDisplay.getDisplayedMessage(tabId);
        ids = [message.id];
    }

    async function getDefaultAction() {
        const localStorage =
            await browser.storage.local.get(["trainingButtonHam-defaultAction", "trainingButtonSpam-defaultAction"]);
        return (buttonId === "rspamdSpamnessButtonHam" && localStorage["trainingButtonHam-defaultAction"] === "copy" ||
            buttonId === "rspamdSpamnessButtonSpam" && localStorage["trainingButtonSpam-defaultAction"] === "copy")
            ? "copy"
            : "move";
    }

    const action = selectedAction || await getDefaultAction();

    if (["bayes", "fuzzy", "check"].includes(action)) {
        await sendMessageToRspamd(message, buttonId, action);
        return;
    }

    const accountId = (message.external) ? null : message.folder.accountId;
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
    const destination = folders.reduce((prev, curr, i, arr) => {
        const folder = (i) ? prev.subFolders : prev.folders;
        const subFolder =
            folder.find((f) => f.path.replace(/.*[/]/, "") === decodeURIComponent(curr) || f.name === curr);
        // Break loop by mutating iterated copy
        if (!subFolder) arr.splice(1);
        return subFolder;
    }, account);

    if (typeof destination === "undefined") {
        libBackground.displayNotification("spamness.alertText.destinationFolderNotFound");
        return;
    }

    if (action === "move" && message.external) {
        libBackground.displayNotification("spamness.alertText.moveNotPermittedForExternalMessages");
        return;
    }

    browser.messages[action](ids, destination).catch(function (error) {
        libBackground.error(error);
        if ((/^Unexpected error (copy|mov)ing messages: 2147500037$/).test(error.message)) {
            libBackground.displayNotification(
                "spamness.alertText.error_2147500037_workaround",
                error.message + "\n\n"
            );
        }
    });
}

function addTrainButtonsToWindow(windowId, tabIndex) {
    browser.trainButtons.addButtonsToWindowById(windowId, tabIndex).then((targetIds) => {
        targetIds.forEach(function (targetId) {
            browser.trainButtons.onButtonCommand.addListener((selectedAction) => {
                moveMessage(targetId, windowId, tabIndex, selectedAction);
            }, targetId, windowId, tabIndex);
        });
    });
}

function initMessageHeader(justAddButtons) {
    browser.windows.getAll({populate: true, windowTypes: ["normal", "messageDisplay"]}).then((windows) => {
        windows.forEach(function (window) {
            window.tabs
                .filter((tab) => (window.type === "normal" &&
                    (tab.mailTab || tab.type === "messageDisplay") ||
                    window.type === "messageDisplay"))
                .forEach((tab) => {
                    if (justAddButtons) {
                        addTrainButtonsToWindow(tab.windowId, tab.index);
                    } else {
                        browser.messageDisplay.getDisplayedMessage(tab.id).then((message) => {
                            if (!message) return;
                            addControlsToWindow(tab.windowId, tab.index);

                            browser.messages.getFull(message.id).then(async (messagepart) => {
                                const {headers} = messagepart;
                                if (headers) await messageHeader.displayHeaders(false, tab, message, headers);
                            }).catch((e) => libBackground.error(e));
                        // Thundebird fails to get messages from external files and attachments.
                        }).catch((e) => libBackground.error(e));
                    }
                });
        });
    });
}

browser.storage.local.get(libBackground.defaultOptions.keys).then((localStorage) => {
    const missing = {};
    for (const k in libBackground.defaultOptions) {
        if (!Object.prototype.hasOwnProperty.call(localStorage, k)) {
            missing[k] = libBackground.defaultOptions[k];
            localStorage[k] = libBackground.defaultOptions[k];
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

    disableSymGroupingMenuitem(localStorage["headers-group_symbols"]);
    disableSymOrderMenuitem(localStorage["headers-symbols_order"]);
});

let lastDisplayedMessageId = null;

browser.mailTabs.onSelectedMessagesChanged.addListener((tab, selectedMessages) => {
    if (selectedMessages.messages.length !== 1) return;
    // The same message was reselected (e.g. after column sorting)
    if (selectedMessages.messages[0].id === lastDisplayedMessageId) return;
    // Hide headers until message is loaded
    ["expandedRspamdSpamnessRow", "expandedRspamdSpamnessRulesRow"].forEach(function (id) {
        browser.spamHeaders.setHeaderHidden(tab.windowId, tab.index, id, true);
    });
});

initMessageHeader();

browser.messageDisplay.onMessageDisplayed.addListener((tab, message) => {
    addControlsToWindow(tab.windowId, tab.index);

    lastDisplayedMessageId = message.id;
    browser.messages.getFull(message.id).then(async (messagepart) => {
        const {headers} = messagepart;
        if (headers) await messageHeader.displayHeaders(false, tab, message, headers);
    }).catch((e) => libBackground.error(e));
});

browser.runtime.onMessage.addListener(function handleMessage(request, sender, sendResponse) {
    switch (request.method) {
        case "addTrainButtonsToNormalWindows":
            initMessageHeader(true);
            break;
        case "getRulesDialogContent":
            (function () {
                const re = /([\t ]+(?:(?:Symbol?: )?[^)\t ]+\)(?:\[[^\]]*\])?|Message-ID: [^ ]+?))/g;
                const content = libHeader.headerStr[0].replace(re, "\n$1");
                sendResponse({response: content});
            }());
            break;
        case "syncHeaderPrefs":
            libBackground.syncHeaderPrefs(request.data);
            break;
        default:
            libBackground.error("Unknown request: " + request);
    }
});

async function addControlsToWindow(windowId, tabIndex) {
    browser.spamHeaders.addHeadersToWindowById(windowId, tabIndex);
    const localStorage =
        await browser.storage.local.get(["trainingButtons-enabled", "headers-symbols_order", "headers-group_symbols"]);
    if (localStorage["trainingButtons-enabled"]) {
        addTrainButtonsToWindow(windowId, tabIndex);
    }

    browser.popup.addPopupToWindowById(
        windowId, tabIndex,
        localStorage["headers-symbols_order"], localStorage["headers-group_symbols"]
    ).then((success) => {
        if (!success) return;
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
                case "rspamdSpamnessSymbolTrainHam":
                    moveMessage("rspamdSpamnessButtonHam", windowId, tabIndex);
                    break;
                case "rspamdSpamnessSymbolTrainSpam":
                    moveMessage("rspamdSpamnessButtonSpam", windowId, tabIndex);
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
}

(function appendPopup() {
    function onCreated() {
        if (browser.runtime.lastError) libBackground.error(browser.runtime.lastError);
    }

    function appendMenuitem(id, label, command, icons) {
        browser.menus.create({
            contexts: ["all"],
            icons: icons,
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
        "rspamdSpamnessSymbolTrainHam",
        "spamness.buttonTrainHam.label",
        () => moveMessage("rspamdSpamnessButtonHam", "contextMenuPopup"),
        {16: "images/arrow-down.png"}
    );
    appendMenuitem(
        "rspamdSpamnessSymbolTrainSpam",
        "spamness.buttonTrainSpam.label",
        () => moveMessage("rspamdSpamnessButtonSpam", "contextMenuPopup"),
        {16: "images/arrow-up.png"}
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
