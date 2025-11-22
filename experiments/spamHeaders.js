/* global ChromeUtils, libExperiments, globalThis */
/* exported spamHeaders */

"use strict";

/* eslint-disable no-var */
var Services = globalThis.Services || ChromeUtils.import("resource://gre/modules/Services.jsm").Services;
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
var spamHeaders = class extends ExtensionCommon.ExtensionAPI {
    // eslint-disable-next-line max-lines-per-function
    getAPI(context) {
        const ExtensionParent = importModule("ExtensionParent");
        const extension = ExtensionParent.GlobalManager
            .getExtension("rspamd-spamness@alexander.moisseev");
        Services.scriptloader.loadSubScript(extension.getURL("experiments/libExperiments.js"));

        let maxHeight = null;

        function addHeadersToWindowById(windowId, tabIndex) {
            const document = libExperiments.getDocumentByTabIndex(windowId, tabIndex);

            (function loadCSS() {
                ["content/spinner.css", "experiments/spamHeaders.css"].forEach((href, index) => {
                    const elementId = "rspamd-spamness-css-" + index;
                    const element = document.getElementById(elementId);

                    if (element) return;

                    const link = document.createElement("link");
                    link.id = elementId;
                    link.rel = "stylesheet";
                    link.href = extension.rootURI.resolve(href);

                    if (majorVersion < 91) {
                        const referenceNode = document.getElementById("navigation-toolbox");
                        referenceNode.parentNode.insertBefore(link, referenceNode);
                    } else {
                        document.head.appendChild(link);
                    }
                });
            }());

            const expandedHeaders2 = document
                .getElementById(majorVersion < 100 ? "expandedHeaders2" : "extraHeadersArea");

            function scoreHeaderRowValue() {
                const headerRowValue = document.createElement("td");

                const hbox = document.createXULElement("hbox");

                const scoreVbox = document.createXULElement("vbox");
                const scoreIcon = document.createXULElement("image");
                scoreIcon.id = "rspamdSpamnessScoreIcon";
                scoreVbox.appendChild(scoreIcon);
                hbox.appendChild(scoreVbox);

                const scoreHeader = document.createXULElement("mail-headerfield");
                scoreHeader.id = "rspamdSpamnessScoreHeader";
                hbox.appendChild(scoreHeader);

                const bayesVbox = document.createXULElement("vbox");
                const bayesIcon = document.createXULElement("image");
                bayesIcon.id = "rspamdSpamnessBayesIcon";
                bayesVbox.appendChild(bayesIcon);
                hbox.appendChild(bayesVbox);

                const bayesHeader = document.createXULElement("mail-headerfield");
                bayesHeader.id = "rspamdSpamnessBayesHeader";
                hbox.appendChild(bayesHeader);

                const fuzzyVbox = document.createXULElement("vbox");
                const fuzzyIcon = document.createXULElement("image");
                fuzzyIcon.id = "rspamdSpamnessFuzzyIcon";
                fuzzyVbox.appendChild(fuzzyIcon);
                hbox.appendChild(fuzzyVbox);

                const fuzzyHeader = document.createXULElement("mail-headerfield");
                fuzzyHeader.id = "rspamdSpamnessFuzzyHeader";
                hbox.appendChild(fuzzyHeader);

                const scanTimeHeader = document.createXULElement("mail-headerfield");
                scanTimeHeader.id = "rspamdSpamnessScanTimeHeader";
                hbox.appendChild(scanTimeHeader);

                const actionHeader = document.createXULElement("mail-headerfield");
                actionHeader.id = "rspamdSpamnessActionHeader";
                hbox.appendChild(actionHeader);

                const notificationVbox = document.createXULElement("vbox");
                notificationVbox.id = "rspamdSpamnessNotificationArea";
                notificationVbox.classList.add("hidden");
                hbox.appendChild(notificationVbox);

                const spinner = document.createElement("div");
                spinner.id = "in-progress-spinner";
                spinner.className = "spinner spinner-hidden";
                hbox.appendChild(spinner);

                headerRowValue.appendChild(hbox);

                return headerRowValue;
            }

            function rulesHeaderRowValue() {
                const headerRowValue = document.createXULElement("mail-multi-linkField");
                headerRowValue.id = "expandedRspamdSpamnessRulesBox";

                const hbox = document.createXULElement("hbox");
                hbox.id = "rulesHeaderValueBox";

                const div = document.createXULElement("div");
                div.classList.add("headerValue");
                div.id = "links";
                hbox.appendChild(div);
                headerRowValue.appendChild(hbox);

                const button = document.createElement("button");
                button.id = "heightButton";
                button.classList.add("toolbarbutton-1");
                headerRowValue.appendChild(button);

                return headerRowValue;
            }

            function createHeaderRow(row) {
                const rows = {
                    rules: {
                        id: "expandedRspamdSpamnessRulesRow",
                        titleLabel: {
                            control: "expandedRspamdSpamnessRulesBox",
                            id: "expandedRspamdSpamnessRulesLabel",
                            value: context.extension.localeData
                                .localizeMessage("spamness.rulesMessageHeader.label")
                        },
                        value: rulesHeaderRowValue(),
                    },
                    score: {
                        id: "expandedRspamdSpamnessRow",
                        titleLabel: {
                            control: "rspamdSpamnessScoreHeader",
                            id: "expandedRspamdSpamnessLabel",
                            value: context.extension.localeData
                                .localizeMessage("spamness.messageHeader.label")
                        },
                        value: scoreHeaderRowValue(),
                    }
                };

                const element = document.createElement(majorVersion < 100 ? "tr" : "div");
                element.hidden = true;
                element.id = rows[row].id;
                element.classList.add("message-header-row");

                const headerRowTitleLabel = document.createXULElement("label");
                headerRowTitleLabel.id = rows[row].titleLabel.id;
                headerRowTitleLabel.classList.add(majorVersion < 100 ? "headerName" : "message-header-label");
                headerRowTitleLabel.value = rows[row].titleLabel.value;
                headerRowTitleLabel.control = rows[row].titleLabel.control;

                if (majorVersion < 100) {
                    const headerRowTitle = document.createElement("th");
                    headerRowTitle.appendChild(headerRowTitleLabel);
                    element.appendChild(headerRowTitle);
                } else {
                    element.appendChild(headerRowTitleLabel);
                }

                element.appendChild(rows[row].value);
                expandedHeaders2.appendChild(element);
            }

            if (expandedHeaders2) {
                if (!document.getElementById("expandedRspamdSpamnessRow")) createHeaderRow("score");
                if (!document.getElementById("expandedRspamdSpamnessRulesRow")) {
                    createHeaderRow("rules");

                    const button = document.getElementById("heightButton");
                    button.addEventListener("click", function () {
                        toggleHeaderHeight(document, button.value);
                    });
                }
                toggleHeaderHeight(document);
            } else {
                throw Error("Could not find the expandedHeaders2 element");
            }
        }

        function toggleHeaderHeight(document, value) {
            const headerRowValue = document.getElementById("expandedRspamdSpamnessRulesBox");
            const button = document.getElementById("heightButton");
            if (value === "expand") {
                button.value = "collapse";
                headerRowValue.classList.remove("fieldCollapsed");
                headerRowValue.style["max-height"] = null;
            } else {
                button.value = "expand";
                headerRowValue.classList.add("fieldCollapsed");
                headerRowValue.style["max-height"] = maxHeight;
            }
            const svgPathCommands = {
                collapse: "M2 5h3v-3m0 3l-4 -4M10 2v3h3m-3 0l4 -4M2 10h3v3m0 -3l-4 4M10 13v-3h3m-3 0l4 4",
                expand: "M1 5V1h4m-4 0l4 4M10 1h4v4m0-4l-4 4M1 10v4h4m-4 0l4 -4M10 14h4v-4m0 4l-4 -4"
            };
            button.innerHTML =
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15" width="16" height="16"
                    fill="none" stroke="currentColor" stroke-linecap="round">
                    <path d="${svgPathCommands[button.value]}"/>
                </svg>`;
            if (majorVersion < 100) document.getElementById("expandedHeaderView").removeAttribute("height");
        }

        context.callOnClose(this);
        return {
            spamHeaders: {
                addHeadersToWindowById(windowId, tabIndex) {
                    addHeadersToWindowById(windowId, tabIndex);
                },

                addSymbol(windowId, tabIndex, symbolClass, displayText, tooltiptext) {
                    const document = libExperiments.getDocumentByTabIndex(windowId, tabIndex);
                    if (!document) return;

                    const link = document.createXULElement("mail-link");
                    if (symbolClass !== "") {
                        link.classList.add(symbolClass);
                    }
                    if (typeof tooltiptext !== "undefined") {
                        link.setAttribute("tooltiptext", tooltiptext);
                    }
                    const description = document.createXULElement("description");
                    description.classList.add("linkDisplayButton");
                    description.role = "textbox";
                    description["aria-readonly"] = true;
                    ["click", "contextmenu"].forEach((e) => {
                        description.addEventListener(e, (event) => {
                            const popup = document.getElementById("rspamdSpamnessSymbolPopup");
                            popup.headerField = event.target;
                            popup.openPopupAtScreen(event.screenX, event.screenY, true);
                        });
                    });
                    description.innerHTML = displayText;
                    link.appendChild(description);
                    const comma = document.createXULElement("description");
                    comma.classList.add("linkSeparator");
                    comma.innerHTML = ",";

                    const links = document.getElementById("links");
                    if (links.lastChild) links.lastChild.appendChild(comma);
                    links.appendChild(link);
                },

                clearSymbolsHeader(windowId, tabIndex, show_n_lines) {
                    const document = libExperiments.getDocumentByTabIndex(windowId, tabIndex);
                    const parent = document.getElementById("links");
                    while (parent.firstChild) {
                        parent.removeChild(parent.firstChild);
                    }

                    if (show_n_lines === "0") {
                        maxHeight = "auto";
                        document.getElementById("heightButton").hidden = true;
                        document.getElementById("expandedRspamdSpamnessRulesBox").classList.remove("fieldCollapsed");
                    } else {
                        const {lineHeight} = document.defaultView.getComputedStyle(parent, null);
                        const numericLineHeight = (lineHeight === "normal") ? "1em" : lineHeight;
                        maxHeight = "calc((" + numericLineHeight + " + 0.1em + 2px) * " + show_n_lines + ")";
                        document.getElementById("heightButton").hidden = false;
                        toggleHeaderHeight(document, "collapse");
                    }
                },

                setHeaderHidden(windowId, tabIndex, elementId, hidden) {
                    // Ensure that the all visible labels have the same size.
                    function syncGridColumnWidths(document) {
                        const allHeaderLabels = document
                            .querySelectorAll(".message-header-row:not([hidden]) .message-header-label");

                        // Clear existing style.
                        for (const label of allHeaderLabels) {
                            label.style.minWidth = null;
                        }

                        const minWidth = Math.max(...Array.from(allHeaderLabels, (i) => i.clientWidth));
                        for (const label of allHeaderLabels) {
                            label.style.minWidth = `${minWidth}px`;
                        }
                    }

                    const document = libExperiments.getDocumentByTabIndex(windowId, tabIndex);
                    if (!document) return;
                    const element = document.getElementById(elementId);

                    if (element) {
                        element.hidden = hidden;
                        if (majorVersion >= 100) syncGridColumnWidths(document);
                    }
                },

                setHeaderValue(windowId, tabIndex, elementId, prop, value) {
                    const document = libExperiments.getDocumentByTabIndex(windowId, tabIndex);
                    if (!document) return;

                    const element = document.getElementById(elementId);
                    if (prop === "src") {
                        element[prop] = extension.rootURI.resolve(value);
                    } else if (prop === "notificationClass") {
                        if (elementId === "rspamdSpamnessNotificationArea") {
                            const validLogLevels = ["log", "info", "warn", "error"];
                            validLogLevels.forEach((level) => element.classList.remove(level));
                            element.classList.add(value.toLowerCase());
                        }
                    } else if (prop === "classListAdd") {
                        element.classList.add(value);
                    } else if (prop === "classListRemove") {
                        element.classList.remove(value);
                    } else {
                        element.textContent = value;

                        if (elementId === "rspamdSpamnessActionHeader") {
                            element.style["background-color"] =
                                ["no action", "rewrite subject", "add header"].includes(value)
                                    ? "var(--" + value.replace(/\s/g, "-") + ")"
                                    : null;
                        }

                        // Hide notification area border if content is empty.
                        if (elementId === "rspamdSpamnessNotificationArea")
                            element.classList.toggle("hidden", !value.trim());
                    }
                },
            },
        };
    }

    // eslint-disable-next-line class-methods-use-this
    close() {
        libExperiments.removeElements([
            "expandedRspamdSpamnessRow",
            "expandedRspamdSpamnessRulesRow",
            "rspamd-spamness-css-0",
            "rspamd-spamness-css-1",
        ], majorVersion < 100);
    }
};
