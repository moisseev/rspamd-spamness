/* global ChromeUtils, libExperiments */
/* exported trainButtons */

"use strict";

/* eslint-disable no-var */
var Services = globalThis.Services ?? ChromeUtils.import("resource://gre/modules/Services.jsm").Services;
var [majorVersion] = Services.appinfo.platformVersion.split(".", 1);

/**
 * Dynamically imports a module based on the Thunderbird version.
 *
 * For Thunderbird 136 and above, it imports the ESM version of the module.
 * For older versions, it imports the JSM version.
 *
 * @param {string} name - The name of the module to import.
 * @returns {*} The exported module object.
 */
function importModule(name) {
    const moduleSubdir = name === "ExtensionSupport" ? "" : "gre";
    return majorVersion >= 136
        ? ChromeUtils.importESModule("resource://" + moduleSubdir + "/modules/" + name + ".sys.mjs")[name]
        : ChromeUtils.import("resource://" + moduleSubdir + "/modules/" + name + ".jsm")[name];
}

// eslint-disable-next-line vars-on-top
var ExtensionCommon = importModule("ExtensionCommon");
/* eslint-enable no-var */

// eslint-disable-next-line no-var, vars-on-top
var trainButtons = class extends ExtensionCommon.ExtensionAPI {
    // eslint-disable-next-line class-methods-use-this
    onShutdown(isAppShutdown) {
        if (isAppShutdown) return;
        removeButtonsFromAllWindows();
    }

    getAPI(context) {
        const ExtensionParent = importModule("ExtensionParent");
        const extension = ExtensionParent.GlobalManager
            .getExtension("rspamd-spamness@alexander.moisseev");
        Services.scriptloader.loadSubScript(extension.getURL("experiments/libExperiments.js"));

        function appendButtons(windowId, tabIndex) {
            const targetIds = [];
            const document = libExperiments.getDocumentByTabIndex(windowId, tabIndex);
            const toolbar = document.getElementById("header-view-toolbar");

            function appendToolbarButton(hamSpam, imageURL) {
                const toolbarbuttonId = "rspamdSpamnessButton" + hamSpam;
                if (document.getElementById(toolbarbuttonId)) return;

                // The button container
                const toolbarbutton = document.createXULElement("toolbarbutton");
                toolbarbutton.setAttribute("is", "toolbarbutton-menu-button");
                toolbarbutton.setAttribute("type", majorVersion < 111 ? "menu-button" : "menu");
                toolbarbutton.id = toolbarbuttonId;
                toolbarbutton.classList
                    .add("toolbarbutton-1", majorVersion < 100 ? "msgHeaderView-button" : "message-header-view-button");
                toolbarbutton.setAttribute(
                    "tooltiptext",
                    context.extension.localeData
                        .localizeMessage("spamness.buttonTrain" + hamSpam + ".tooltip")
                );

                const primaryButton = document.createXULElement("toolbarbutton");
                primaryButton.classList.add("box-inherit", "toolbarbutton-menubutton-button");

                const img = document.createElement("img");
                img.src = imageURL;
                img.classList.add("toolbarbutton-icon");
                primaryButton.appendChild(img);

                const label = document.createElement("label");
                if (majorVersion < 110) label.style.display = "-moz-inline-box";
                label.innerHTML = context.extension.localeData
                    .localizeMessage("spamness.buttonTrain" + hamSpam + ".label");
                primaryButton.appendChild(label);

                toolbarbutton.appendChild(primaryButton);

                const dropmarker = document.createXULElement("dropmarker");
                dropmarker.classList.add("toolbarbutton-menubutton-dropmarker");
                toolbarbutton.appendChild(dropmarker);

                const menupopup = document.createXULElement("menupopup");

                ["move", "copy", "bayes", "fuzzy", "check"].forEach((action) => {
                    const item = document.createXULElement("menuitem");
                    const itemLabel = context.extension.localeData.localizeMessage("spamness.action.label." + action);
                    item.setAttribute("label", itemLabel);
                    item.setAttribute("data-action", action);

                    menupopup.appendChild(item);
                });

                toolbarbutton.appendChild(menupopup);

                dropmarker.addEventListener("click", (event) => {
                    event.stopPropagation();
                    menupopup.openPopup(toolbarbutton, "after_end", 0, 0, true, false);
                });

                toolbar.insertBefore(toolbarbutton, toolbar.firstChild);
                targetIds.push(toolbarbuttonId);
            }

            if (toolbar) {
                appendToolbarButton("Spam", extension.getURL("images/arrow-up-18.svg"));
                appendToolbarButton("Ham", extension.getURL("images/arrow-down-18.svg"));
            } else {
                // eslint-disable-next-line no-console
                console.error("Could not find the header-view-toolbar element");
            }
            return targetIds;
        }

        context.callOnClose(this);
        return {
            trainButtons: {
                addButtonsToWindowById(windowId, tabIndex) {
                    return appendButtons(windowId, tabIndex);
                },
                onButtonCommand: new ExtensionCommon.EventManager({
                    context,
                    name: "trainButtons.onButtonCommand",
                    register(fire, targetId, windowId, tabIndex) {
                        function handleButtonClick(event) {
                            const selectedAction = event.target.dataset.action;
                            return fire.async(selectedAction);
                        }
                        const document = libExperiments.getDocumentByTabIndex(windowId, tabIndex);
                        const target = document.getElementById(targetId);
                        target.addEventListener("command", handleButtonClick);
                        return function () {
                            target.removeEventListener("command", handleButtonClick);
                        };
                    }
                }).api(),
                removeButtons() {
                    removeButtonsFromAllWindows();
                },
            },
        };
    }

    // eslint-disable-next-line class-methods-use-this
    close() {
        removeButtonsFromAllWindows();
    }
};

function removeButtonsFromAllWindows() {
    libExperiments.removeElements([
        "rspamdSpamnessButtonHam",
        "rspamdSpamnessButtonSpam"
    ]);
}
