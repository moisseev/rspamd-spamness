/* global ChromeUtils, libExperiments */
/* exported trainButtons */

"use strict";

/* eslint-disable no-var */
var {ExtensionCommon} = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
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

        function appendButtons(window) {
            const toolbar = window.document.getElementById("header-view-toolbar");

            function appendToolbarButton(cls, imageURL) {
                const toolbarbuttonId = "rspamdSpamnessButton" + cls;
                if (window.document.getElementById(toolbarbuttonId)) return;

                const toolbarbutton = window.document.createXULElement("toolbarbutton");
                toolbarbutton.id = toolbarbuttonId;
                toolbarbutton.classList.add("toolbarbutton-1", "msgHeaderView-button");
                toolbarbutton.label = context.extension.localeData
                    .localizeMessage("spamness.buttonTrain" + cls + ".label");
                toolbarbutton.setAttribute(
                    "tooltiptext",
                    context.extension.localeData
                        .localizeMessage("spamness.buttonTrain" + cls + ".tooltip")
                );
                toolbarbutton.style["list-style-image"] = "url(" + imageURL + ")";

                toolbar.insertBefore(toolbarbutton, toolbar.firstChild);
            }

            if (toolbar) {
                appendToolbarButton("Spam", extension.getURL("images/arrow-up.png"));
                appendToolbarButton("Ham", extension.getURL("images/arrow-down.png"));
            } else {
                // eslint-disable-next-line no-console
                console.error("Could not find the header-view-toolbar element");
            }
        }

        context.callOnClose(this);
        return {
            trainButtons: {
                addButtonsToWindowById(windowId) {
                    appendButtons(Services.wm.getOuterWindowWithId(windowId));
                },
                onButtonCommand: new ExtensionCommon.EventManager({
                    context,
                    name: "trainButtons.onButtonCommand",
                    register(fire, targetId, windowId) {
                        function callback(event) {
                            return fire.async(event.target.id);
                        }
                        const window = Services.wm.getOuterWindowWithId(windowId);
                        const target = window.document.getElementById(targetId);
                        target.addEventListener("command", callback);
                        return function () {
                            target.removeEventListener("command", callback);
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
