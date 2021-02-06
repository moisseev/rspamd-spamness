/* global browser, libBackground, libPopup */

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
            [2, 0, "id", "TrainHam"],
            [2, 1, "id", "TrainSpam"]
        ];
        for (const [vboxIdx, vboxChildIdx, attr, value] of attributes) {
            acountBox.cells[vboxIdx].getElementsByTagName("tr")[vboxChildIdx].cells[0].firstChild
                .setAttribute(attr, value + index);
        }
    }

    async function setFolderPath(account, index, folder) {
        const {isDefault, path} = await libBackground.getFolderPath(account, folder);
        document.getElementById(folder + index).setAttribute(
            isDefault ? "placeholder" : "value",
            isDefault ? "default" : path
        );
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
            setFolderPath(account, index, "TrainHam");
            setFolderPath(account, index, "TrainSpam");

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
}

async function savePrefs(e) {
    e.preventDefault();
    const container = document.getElementById("account-box-container");
    const remove = [];
    const set = {};
    for (let index = 0; index < (container.children.length - 1); index++) {
        if (document.getElementById("account-box" + index).hidden) continue;
        const accountId = document.getElementById("account-box" + index)
            .getAttribute("data-account-key");
        for (const folder of ["TrainHam", "TrainSpam"]) {
            const {value} = document.getElementById(folder + index);
            const key = accountId + "-folder" + folder;
            if (document.getElementById(folder + index).value) {
                set[key] = value;
            } else {
                remove.push(key);
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
