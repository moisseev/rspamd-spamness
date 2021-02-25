/* global messenger */

"use strict";

const libOptions = {};

libOptions.populateSelect = async function (
    id, defaultTrainingFolderAccountId,
    defaultTrainingFolderAccount, dstAccount, isDefault
) {
    function addOptionText(option, account, prefix = "") {
        option.text = prefix + account.name;
        const {identities} = account;
        if (identities.length) {
            // Get default identity (index = 0)
            const [identity] = identities;
            option.text += " - " + identity.name + " <" + identity.email + ">";
        }
    }

    const select = document.querySelector(id);

    const unset = document.createElement("option");
    if (arguments.length > 2) addOptionText(unset, defaultTrainingFolderAccount, "[default] ");
    unset.value = "";
    unset.selected = true;
    select.appendChild(unset);

    (await messenger.runtime.getBackgroundPage()).browser.accounts.list().then((accounts) => {
        for (const account of accounts) {
            // Skip IM and RSS accounts
            const {type} = account;
            if (type === "im" || type === "rss") continue;

            const option = document.createElement("option");
            option.value = account.id;
            if (arguments.length > 2) {
                if (!isDefault && account.id === dstAccount) option.selected = true;
            } else if (account.id === defaultTrainingFolderAccountId) option.selected = true;
            addOptionText(option, account);
            select.appendChild(option);
        }
    });
};
