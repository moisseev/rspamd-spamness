/* global ChromeUtils, Components, libExperiments */
/* exported spamHeaders */

"use strict";

/* eslint-disable no-var */
var {ExtensionCommon} = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
/* eslint-enable no-var */
// eslint-disable-next-line no-var
var spamHeaders = class extends ExtensionCommon.ExtensionAPI {
    // eslint-disable-next-line max-lines-per-function
    getAPI(context) {
        const {ExtensionParent} =
            ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
        const extension = ExtensionParent.GlobalManager
            .getExtension("rspamd-spamness@alexander.moisseev");
        Services.scriptloader.loadSubScript(extension.getURL("experiments/libExperiments.js"));

        let maxHeight = null;

        function getDocumentByTabId(tabId) {
            const target = ExtensionParent.apiManager.global.tabTracker.getTab(tabId);
            const window = Components.utils.getGlobalForObject(target);
            return window.document;
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
            document.getElementById("expandedHeaderView").removeAttribute("height");
        }

        context.callOnClose(this);
        return {
            spamHeaders: {
                addHeadersToWindowById(windowId) {
                    const window = Services.wm.getOuterWindowWithId(windowId);
                    const {document} = window;

                    (function loadCSS() {
                        const href = extension.rootURI.resolve("experiments/spamHeaders.css");

                        const link = document.createElement("link");
                        link.id = "rspamd-spamness-css";
                        link.rel = "stylesheet";
                        link.href = href;

                        const referenceNode = document.getElementById("navigation-toolbox");
                        referenceNode.parentNode.insertBefore(link, referenceNode);
                    })();

                    const expandedHeaders2 = document.getElementById("expandedHeaders2");

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
                        scoreHeader.headerValue = "";
                        hbox.appendChild(scoreHeader);

                        const bayesVbox = document.createXULElement("vbox");
                        const bayesIcon = document.createXULElement("image");
                        bayesIcon.id = "rspamdSpamnessBayesIcon";
                        bayesVbox.appendChild(bayesIcon);
                        hbox.appendChild(bayesVbox);

                        const bayesHeader = document.createXULElement("mail-headerfield");
                        bayesHeader.id = "rspamdSpamnessBayesHeader";
                        bayesHeader.headerValue = "";
                        hbox.appendChild(bayesHeader);

                        const fuzzyVbox = document.createXULElement("vbox");
                        const fuzzyIcon = document.createXULElement("image");
                        fuzzyIcon.id = "rspamdSpamnessFuzzyIcon";
                        fuzzyVbox.appendChild(fuzzyIcon);
                        hbox.appendChild(fuzzyVbox);

                        const fuzzyHeader = document.createXULElement("mail-headerfield");
                        fuzzyHeader.id = "rspamdSpamnessFuzzyHeader";
                        fuzzyHeader.headerValue = "";
                        hbox.appendChild(fuzzyHeader);

                        const scanTimeHeader = document.createXULElement("mail-headerfield");
                        scanTimeHeader.id = "rspamdSpamnessScanTimeHeader";
                        scanTimeHeader.headerValue = "";
                        hbox.appendChild(scanTimeHeader);

                        headerRowValue.appendChild(hbox);

                        return headerRowValue;
                    }

                    function rulesHeaderRowValue() {
                        const headerRowValue = document.createXULElement("mail-multi-linkField");
                        headerRowValue.id = "expandedRspamdSpamnessRulesBox";

                        const hbox = document.createXULElement("hbox");
                        hbox.id = "rulesHeaderValueBox";
                        hbox.flex = "1";

                        const div = document.createXULElement("div");
                        div.classList.add("headerValue");
                        div.id = "links";
                        div.flex = "1";
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

                        const element = document.createElement("tr");
                        element.hidden = true;
                        element.id = rows[row].id;

                        const headerRowTitle = document.createElement("th");
                        const headerRowTitleLabel = document.createXULElement("label");
                        headerRowTitleLabel.id = rows[row].titleLabel.id;
                        headerRowTitleLabel.classList.add("headerName");
                        headerRowTitleLabel.value = rows[row].titleLabel.value;
                        headerRowTitleLabel.control = rows[row].titleLabel.control;
                        headerRowTitle.appendChild(headerRowTitleLabel);

                        element.appendChild(headerRowTitle);
                        element.appendChild(rows[row].value);
                        expandedHeaders2.appendChild(element);
                    }

                    if (expandedHeaders2) {
                        createHeaderRow("score");
                        createHeaderRow("rules");

                        const button = document.getElementById("heightButton");
                        button.addEventListener("click", function () {
                            toggleHeaderHeight(document, button.value);
                        });
                        toggleHeaderHeight(document);
                    } else {
                        throw Error("Could not find the expandedHeaders2 element");
                    }
                },

                addSymbol(tabId, symbolClass, displayText, tooltiptext) {
                    const document = getDocumentByTabId(tabId);
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
                    description.setAttribute("context", "rspamdSpamnessSymbolPopup");
                    description.setAttribute("popup", "rspamdSpamnessSymbolPopup");
                    description.innerHTML = displayText;
                    link.appendChild(description);
                    const comma = document.createXULElement("description");
                    comma.classList.add("linkSeparator");
                    comma.innerHTML = ",";

                    const links = document.getElementById("links");
                    if (links.lastChild) links.lastChild.appendChild(comma);
                    links.appendChild(link);
                },

                clearSymbolsHeader(tabId, show_n_lines) {
                    maxHeight = "calc((1px + 1.4em) * " + show_n_lines + " + 0.2em + 3px)";

                    const document = getDocumentByTabId(tabId);
                    const parent = document.getElementById("links");
                    while (parent.firstChild) {
                        parent.removeChild(parent.firstChild);
                    }
                    toggleHeaderHeight(document, "collapse");
                },

                removeHeight(tabId, elementId) {
                    const document = getDocumentByTabId(tabId);
                    if (!document) return;
                    const element = document.getElementById(elementId);
                    element.removeAttribute("height");
                },

                setHeaderHidden(tabId, elementId, hidden) {
                    const document = getDocumentByTabId(tabId);
                    if (!document) return;
                    const element = document.getElementById(elementId);
                    element.hidden = hidden;
                },

                setHeaderValue(tabId, elementId, prop, value) {
                    const document = getDocumentByTabId(tabId);
                    if (!document) return;

                    const element = document.getElementById(elementId);
                    if (prop === "src") {
                        element[prop] = extension.rootURI.resolve(value);
                    } else {
                        element[prop] = value;
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
            "rspamd-spamness-css"
        ], true);
    }
};
