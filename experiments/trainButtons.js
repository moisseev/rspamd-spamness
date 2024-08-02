/* global ChromeUtils, libExperiments, globalThis */
/* exported trainButtons */

"use strict";

/* eslint-disable no-var */
var {ExtensionCommon} = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var Services = globalThis.Services || ChromeUtils.import("resource://gre/modules/Services.jsm").Services;
var [majorVersion] = Services.appinfo.platformVersion.split(".", 1);
/* eslint-enable no-var */

// eslint-disable-next-line no-var
var trainButtons = class extends ExtensionCommon.ExtensionAPI {
    // eslint-disable-next-line class-methods-use-this
    onShutdown(isAppShutdown) {
        if (isAppShutdown) return;
        removeButtonsFromAllWindows();
    }

    getAPI(context) {
        const {ExtensionParent} =
            ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
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

                ["move", "copy"].forEach((action) => {
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
                appendToolbarButton("Spam", extension.getURL("images/arrow-up.png"));
                appendToolbarButton("Ham", extension.getURL("images/arrow-down.png"));
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
