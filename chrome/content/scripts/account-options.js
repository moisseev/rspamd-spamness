/* global RspamdSpamness:false */
/* exported initAccountPrefs */

"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");

// eslint-disable-next-line max-lines-per-function
function initAccountPrefs() {
    // "OK" button
    document.addEventListener("dialogaccept", function () {
        savePrefs();
    });
    // "Apply" button
    document.addEventListener("dialogextra1", function () {
        savePrefs();
    });

    let index = 0;
    const {accounts} = Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);

    function addNewAccountBox(container, template) {
        const acountBox = container.appendChild(template.cloneNode(true));
        acountBox.setAttribute("id", "account-box" + index);
        const hbox = acountBox.firstChild;
        const attributes = [
            [0, 0, "id", "account-name"],
            [0, 1, "id", "account-identity"],
            [0, 0, "control", "TrainHam"],
            [0, 1, "control", "TrainHam"],
            [1, 0, "control", "TrainHam"],
            [1, 1, "control", "TrainSpam"],
            [2, 0, "id", "TrainHam"],
            [2, 1, "id", "TrainSpam"]
        ];
        for (const [vboxIdx, vboxChildIdx, attr, value] of attributes) {
            hbox.children[vboxIdx].children[vboxChildIdx].setAttribute(attr, value + index);
        }
    }

    function setUri(account, folder) {
        const {URI, isDefault} = RspamdSpamness.getFolderURI(account, folder);
        document.getElementById(folder + index).setAttribute(
            isDefault ? "placeholder" : "value",
            URI
        );
    }

    const container = document.getElementById("account-box-container");
    const template = document.getElementById("account-box-template");
    for (let acc = 0; acc < accounts.length; acc++) {
        // Get account by index
        const account = accounts.queryElementAt(acc, Components.interfaces.nsIMsgAccount);

        // Skip IM and RSS accounts
        const {type} = account.incomingServer;
        if (type === "im" || type === "rss") continue;

        addNewAccountBox(container, template);
        setUri(account, "TrainHam");
        setUri(account, "TrainSpam");

        document.getElementById("account-box" + index).setAttribute("data-account-key", account.key);
        document.getElementById("account-box" + index).hidden = false;
        document.getElementById("account-name" + index).value = account.incomingServer.prettyName;

        const {identities} = account;
        if (identities.length) {
            // Get default identity (index = 0)
            const identity = identities.queryElementAt(0, Components.interfaces.nsIMsgIdentity);
            document.getElementById("account-identity" + index).value = identity.identityName;
        }

        index++;
    }
    container.removeChild(template);
}

function savePrefs() {
    const container = document.getElementById("account-box-container");
    for (let index = 0; index < container.children.length; index++) {
        if (document.getElementById("account-box" + index).hidden) continue;
        const key = document.getElementById("account-box" + index)
            .getAttribute("data-account-key");
        for (const folder of ["TrainHam", "TrainSpam"]) {
            const {value} = document.getElementById(folder + index);
            const userPref = "extensions.rspamd-spamness." + key + ".uri.folder" + folder;
            if (document.getElementById(folder + index).value) {
                Services.prefs.setCharPref(userPref, value);
            } else {
                Services.prefs.clearUserPref(userPref);
            }
        }
    }
}
