/* global Cc, ChromeUtils, Ci, libExperiments */
/* exported popup */

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
var popup = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        let doc = null;

        const ExtensionParent = importModule("ExtensionParent");
        const extension = ExtensionParent.GlobalManager
            .getExtension("rspamd-spamness@alexander.moisseev");
        Services.scriptloader.loadSubScript(extension.getURL("experiments/libExperiments.js"));

        function disableSymGroupingMenuitem(document, group) {
            document.getElementById("rspamdSpamnessSymbolPopupGroup").disabled = (group);
            document.getElementById("rspamdSpamnessSymbolPopupUngroup").disabled = (!group);
        }
        function disableSymOrderMenuitem(document, order) {
            document.getElementById("rspamdSpamnessSymbolPopupSortByName").disabled = (order === "name");
            document.getElementById("rspamdSpamnessSymbolPopupSortByScore").disabled = (order === "score");
        }
        function disableMenuitem(item, value) {
            function disableItem(window, tabIndex) {
                const {document} = libExperiments.getContentWindow(window, tabIndex);

                if (!document.getElementById("rspamdSpamnessSymbolPopup")) return;

                switch (item) {
                    case "group":
                        disableSymGroupingMenuitem(document, value);
                        break;
                    case "order":
                        disableSymOrderMenuitem(document, value);
                        break;
                    default:
                        // eslint-disable-next-line no-console
                        console.error("Unknown context menu item: " + item);
                }
            }

            ["mail:3pane", "mail:messageWindow"].forEach((windowType) => {
                for (const window of Services.wm.getEnumerator(windowType)) {
                    if (window.gTabmail) {
                        window.gTabmail.tabInfo.forEach((tab, tabIndex) => {
                            if (["mail3PaneTab", "mailMessageTab"].some((n) => n === tab.mode.name)) {
                                disableItem(window, tabIndex);
                            }
                        });
                    } else {
                        disableItem(window);
                    }
                }
            });
        }

        context.callOnClose(this);
        return {
            popup: {
                addPopupToWindowById(windowId, tabIndex, order, group) {
                    doc = libExperiments.getDocumentByTabIndex(windowId, tabIndex);
                    const expandedHeaders2 = doc
                        .getElementById(majorVersion < 100 ? "expandedHeaders2" : "extraHeadersArea");

                    function appendPopup() {
                        const menupopup = doc.createXULElement("menupopup");
                        menupopup.id = "rspamdSpamnessSymbolPopup";

                        function appendMenuitem(id, label, iconPath) {
                            const menuitem = doc.createXULElement("menuitem");
                            if (id) menuitem.id = id;
                            menuitem.label = context.extension.localeData.localizeMessage(label);

                            if (iconPath) {
                                const iconUrl = context.extension.getURL(iconPath);
                                menuitem.setAttribute("image", iconUrl);
                                menuitem.classList.add("menuitem-iconic");
                            }

                            menupopup.appendChild(menuitem);
                        }

                        function menuseparator() {
                            menupopup.appendChild(doc.createXULElement("menuseparator"));
                        }

                        function createCopyMenuitem({id, label, l10nId, textExtractor, hidden = false}) {
                            const menuitem = doc.createXULElement("menuitem");
                            menuitem.id = id;
                            if (l10nId) {
                                menuitem.setAttribute("data-l10n-id", l10nId);
                            } else {
                                menuitem.label = label;
                            }
                            menuitem.setAttribute("image", context.extension.getURL("images/copy.svg"));
                            menuitem.classList.add("menuitem-iconic");
                            menuitem.hidden = hidden;
                            menuitem.addEventListener("command", (event) => {
                                const field = event.currentTarget.parentNode.headerField;
                                const text = textExtractor(field);
                                if (text) {
                                    Cc["@mozilla.org/widget/clipboardhelper;1"]
                                        .getService(Ci.nsIClipboardHelper)
                                        .copyString(text);
                                }
                            });
                            menupopup.appendChild(menuitem);
                        }

                        createCopyMenuitem({
                            id: "copyMenuitem",
                            l10nId: "text-action-copy",
                            textExtractor: (field) => {
                                const tooltiptext = field.parentElement.getAttribute("tooltiptext") ?? "";
                                return field.textContent + tooltiptext;
                            }
                        });

                        createCopyMenuitem({
                            hidden: true,
                            id: "copyFuzzyHashMenuitem",
                            label: context.extension.localeData.localizeMessage("spamness.popupCopyFuzzyHash.label"),
                            textExtractor: (field) => field.getAttribute("data-fuzzy-hashes")
                        });

                        menuseparator();
                        appendMenuitem(
                            "rspamdSpamnessSymbolPopupSortByName",
                            "spamness.popupSortByName.label",
                            "images/sort-name.svg"
                        );
                        appendMenuitem(
                            "rspamdSpamnessSymbolPopupSortByScore",
                            "spamness.popupSortByScore.label",
                            "images/sort-score.svg"
                        );
                        menuseparator();
                        appendMenuitem(
                            "rspamdSpamnessSymbolPopupGroup",
                            "spamness.popupGroup.label",
                            "images/group.svg"
                        );
                        appendMenuitem(
                            "rspamdSpamnessSymbolPopupUngroup",
                            "spamness.popupUngroup.label",
                            "images/ungroup.svg"
                        );
                        menuseparator();
                        appendMenuitem(
                            "rspamdSpamnessSymbolTrainHam",
                            "spamness.buttonTrainHam.label",
                            "images/arrow-down.svg"
                        );
                        appendMenuitem(
                            "rspamdSpamnessSymbolTrainSpam",
                            "spamness.buttonTrainSpam.label",
                            "images/arrow-up.svg"
                        );
                        menuseparator();
                        appendMenuitem(
                            "rspamdSpamnessSymbolPopupOpenRulesDialog",
                            "spamness.popupRawExtendedHeader.label",
                            "images/document.svg"
                        );
                        menuseparator();
                        appendMenuitem(
                            "rspamdSpamnessSymbolPopupOptions",
                            "spamnessOptions.title",
                            "images/settings.svg"
                        );

                        // Handle popupshowing to show/hide "Copy full fuzzy hash" menuitem
                        menupopup.addEventListener("popupshowing", (event) => {
                            const field = event.currentTarget.headerField;
                            if (!field) return;

                            const fuzzyHashes = field.getAttribute("data-fuzzy-hashes");
                            const hasFuzzyHashes = fuzzyHashes && fuzzyHashes.length > 0;

                            doc.getElementById("copyFuzzyHashMenuitem").hidden = !hasFuzzyHashes;
                        });

                        doc.getElementById("mainPopupSet").appendChild(menupopup);

                        disableSymGroupingMenuitem(doc, group);
                        disableSymOrderMenuitem(doc, order);
                    }

                    if (expandedHeaders2) {
                        if (!doc.getElementById("rspamdSpamnessSymbolPopup")) {
                            appendPopup();
                            return true;
                        }
                    } else {
                        throw Error("Could not find the expandedHeaders2 element.");
                    }
                    return false;
                },
                disableSymGroupingMenuitem(group) {
                    disableMenuitem("group", group);
                },
                disableSymOrderMenuitem(order) {
                    disableMenuitem("order", order);
                },
                onSymbolPopupCommand: new ExtensionCommon.EventManager({
                    context,
                    name: "popup.onSymbolPopupCommand",
                    register(fire) {
                        function callback(event) {
                            return fire.async(event.target.id);
                        }
                        const target = doc.getElementById("rspamdSpamnessSymbolPopup");
                        target.addEventListener("command", callback);
                        return function () {
                            target.removeEventListener("command", callback);
                        };
                    }
                }).api(),
            },
        };
    }

    // eslint-disable-next-line class-methods-use-this
    close() {
        libExperiments.removeElements(["rspamdSpamnessSymbolPopup"]);
    }
};
