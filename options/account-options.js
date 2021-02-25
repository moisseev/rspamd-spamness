/* global browser, libBackground, libOptions, libPopup */

"use strict";

function initAccountPrefs() {
    function addNewAccountBox(container, template, index) {
        const acountBox = container.appendChild(template.cloneNode(true));
        acountBox.setAttribute("id", "account-box" + index);
        const attributes = [
            [0, 0, "id", "account-name"],
            [0, 1, "id", "account-identity"],
            [0, 0, "control", "TrainHam"],
            [0, 1, "control", "TrainHam"],
            [1, 0, "control", "TrainHam"],
            [1, 1, "control", "TrainSpam"],
            [2, 0, "id", "accountTrainHam"],
            [2, 0, "class", "ham"],
            [2, 1, "id", "accountTrainSpam"],
            [2, 1, "class", "spam"],
            [3, 0, "id", "TrainHam"],
            [3, 0, "class", "ham"],
            [3, 1, "id", "TrainSpam"],
            [3, 1, "class", "spam"]
        ];
        for (const [vboxIdx, vboxChildIdx, attr, value] of attributes) {
            const element = acountBox.cells[vboxIdx].getElementsByTagName("tr")[vboxChildIdx].cells[0].firstChild;
            if (attr === "class") {
                element.classList.add(value);
            } else {
                element.setAttribute(attr, value + index);
            }
        }
    }

    async function setDestination(accountId, idx, folder) {
        const {account, defaultTrainingFolderAccount, isDefault, path} =
            await libBackground.getDestination(accountId, folder);
        libOptions.populateSelect(
            "#account" + folder + idx, defaultTrainingFolderAccount.id,
            defaultTrainingFolderAccount, account.id, isDefault
        );
        const textbox = document.getElementById(folder + idx);
        textbox.value = path;
        if (isDefault) textbox.setAttribute("disabled", true);
    }

    const container = document.getElementById("account-box-container");
    const template = document.getElementById("account-box-template");
    let index = 0;

    browser.accounts.list().then((accounts) => {
        for (const account of accounts) {

            // Skip IM and RSS accounts
            const {type} = account;
            if (type === "im" || type === "rss") continue;

            addNewAccountBox(container, template, index);
            for (const folder of ["TrainHam", "TrainSpam"]) {
                setDestination(account.id, index, folder);
            }

            document.getElementById("account-box" + index).setAttribute("data-account-key", account.id);
            document.getElementById("account-box" + index).hidden = false;
            document.getElementById("account-name" + index).innerText = account.name;

            const {identities} = account;
            if (identities.length) {
                // Get default identity (index = 0)
                const [identity] = account.identities;
                document.getElementById("account-identity" + index).innerText =
                    identity.name + " <" + identity.email + ">";
            }

            index++;
        }
        template.parentNode.removeChild(template);
    });

    container.addEventListener("change", async function (e) {
        const matches = (/^account([^\d]+)(\d+)$/).exec(e.target.id);
        if (!matches) return;
        const [, folder, idx] = matches;
        const accountId = e.target.value;
        const {path} = await libBackground.getDestination(accountId, folder);
        const textbox = document.getElementById(folder + idx);
        textbox.value = path;
        textbox.disabled = !e.target.selectedIndex;
    }, false);
}

async function savePrefs(e) {
    e.preventDefault();
    const container = document.getElementById("account-box-container");
    const remove = [];
    const set = {};
    for (let index = 0; index < (container.children.length - 2); index++) {
        if (document.getElementById("account-box" + index).hidden) continue;
        const accountId = document.getElementById("account-box" + index)
            .getAttribute("data-account-key");
        for (const folder of ["TrainHam", "TrainSpam"]) {
            const accountKey = accountId + "-account" + folder;
            if (document.getElementById("account" + folder + index).value) {
                set[accountKey] = document.getElementById("account" + folder + index).value;
            } else {
                remove.push(accountKey);
            }

            const {value} = document.getElementById(folder + index);
            const folderKey = accountId + "-folder" + folder;
            if (document.getElementById(folder + index).disabled) {
                remove.push(folderKey);
            } else {
                set[folderKey] = value;
            }
        }
    }
    if (Object.keys(set).length > 0) await browser.storage.local.set(set);
    if (remove.length > 0) await browser.storage.local.remove(remove);
    window.close();
}

document.addEventListener("DOMContentLoaded", initAccountPrefs);
document.querySelector("form").addEventListener("submit", savePrefs);
document.querySelector("form").addEventListener("reset", libPopup.closeWindow);
