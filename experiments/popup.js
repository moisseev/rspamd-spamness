/* global ChromeUtils */
/* exported popup */

"use strict";

/* eslint-disable no-var */
var {ExtensionCommon} = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var {ExtensionSupport} = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var doc = null;
/* eslint-enable no-var */

// eslint-disable-next-line no-var
var popup = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        function disableSymGroupingMenuitem(group) {
            doc.getElementById("rspamdSpamnessSymbolPopupGroup").disabled = (group);
            doc.getElementById("rspamdSpamnessSymbolPopupUngroup").disabled = (!group);
        }
        function disableSymOrderMenuitem(order) {
            doc.getElementById("rspamdSpamnessSymbolPopupSortByName").disabled = (order === "name");
            doc.getElementById("rspamdSpamnessSymbolPopupSortByScore").disabled = (order === "score");
        }

        context.callOnClose(this);
        return {
            popup: {
                addPopupToWindowById(windowId, order, group) {
                    const window = Services.wm.getOuterWindowWithId(windowId);
                    doc = window.document;
                    const expandedHeaders2 = doc.getElementById("expandedHeaders2");

                    function appendPopup() {
                        const menupopup = doc.createXULElement("menupopup");
                        menupopup.id = "rspamdSpamnessSymbolPopup";

                        function appendMenuitem(id, label) {
                            const menuitem = doc.createXULElement("menuitem");
                            if (id) menuitem.id = id;
                            menuitem.label = context.extension.localeData.localizeMessage(label);
                            menupopup.appendChild(menuitem);
                        }

                        function menuseparator() {
                            menupopup.appendChild(doc.createXULElement("menuseparator"));
                        }

                        const copyMenuitem = doc.createXULElement("menuitem");
                        copyMenuitem.id = "copyMenuitem";
                        copyMenuitem.setAttribute("data-l10n-id", "text-action-copy");
                        copyMenuitem.setAttribute("oncommand", `Cc['@mozilla.org/widget/clipboardhelper;1']
                            .getService(Ci.nsIClipboardHelper)
                            .copyString(window.getSelection().isCollapsed ?
                                document.popupNode.textContent :
                                window.getSelection().toString());`);
                        menupopup.appendChild(copyMenuitem);

                        menuseparator();
                        appendMenuitem(
                            "rspamdSpamnessSymbolPopupSortByName",
                            "spamness.popupSortByName.label"
                        );
                        appendMenuitem(
                            "rspamdSpamnessSymbolPopupSortByScore",
                            "spamness.popupSortByScore.label"
                        );
                        menuseparator();
                        appendMenuitem(
                            "rspamdSpamnessSymbolPopupGroup",
                            "spamness.popupGroup.label"
                        );
                        appendMenuitem(
                            "rspamdSpamnessSymbolPopupUngroup",
                            "spamness.popupUngroup.label"
                        );
                        menuseparator();
                        appendMenuitem(
                            "rspamdSpamnessSymbolPopupOpenRulesDialog",
                            "spamness.popupRawExtendedHeader.label"
                        );
                        menuseparator();
                        appendMenuitem(
                            "rspamdSpamnessSymbolPopupOptions",
                            "spamnessOptions.title"
                        );

                        doc.getElementById("mainPopupSet").appendChild(menupopup);

                        disableSymGroupingMenuitem(group);
                        disableSymOrderMenuitem(order);
                    }

                    if (expandedHeaders2) {
                        appendPopup();
                    } else {
                        throw Error("Could not find the expandedHeaders2 element.");
                    }
                },
                disableSymGroupingMenuitem(group) {
                    disableSymGroupingMenuitem(group);
                },
                disableSymOrderMenuitem(order) {
                    disableSymOrderMenuitem(order);
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
        doc.getElementById("rspamdSpamnessSymbolPopup").remove();
        ExtensionSupport.unregisterWindowListener("popupListener");
    }
};
