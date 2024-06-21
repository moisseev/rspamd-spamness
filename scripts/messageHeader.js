/* global browser, libBackground, libCommon, libHeader */

"use strict";

const messageHeader = {};

/**
 * Display headers in msgHeaderView box.
 * @param {boolean} [update_rules=false] - Just redraw "Rules" header, leave other headers as they are.
 * @returns {void}
 */
messageHeader.displayHeaders = async function (update_rules, tab, message, headers) {
    const id = {
        score: {
            hdr: {
                bayes: {
                    icon: "rspamdSpamnessBayesIcon",
                    score: "rspamdSpamnessBayesHeader"
                },
                fuzzy: {
                    icon: "rspamdSpamnessFuzzyIcon",
                    score: "rspamdSpamnessFuzzyHeader"
                },
                score: {
                    icon: "rspamdSpamnessScoreIcon",
                    score: "rspamdSpamnessScoreHeader"
                }
            }
        }
    };

    const localStorage = await browser.storage.local.get([
        "display-messageRules",
        "display-messageScore",
        "header",
        "headers-show_n_lines",
        "headers-symbols_order",
        "headers-colorizeSymbols",
        "headers-group_symbols"
    ]);

    const show = {
        rules: localStorage["display-messageRules"],
        score: update_rules ? false : localStorage["display-messageScore"]
    };

    if (!show.score && !show.rules) return;

    const symbols = await libHeader.getSymbols(headers, localStorage.header);

    if (symbols === null) return;

    function getMetricClass(rule) {
        if (rule.match(/^GREYLIST\(/))
            return "linkDisplayButtonGreyl";

        const metric = rule.match(/\(([-\d.]+)\)$/);
        const metricScore = (metric)
            ? metric[1]
            : null;
        if (metricScore < 0) {
            return "linkDisplayButtonHam";
        } else if (metricScore > 0) {
            return "linkDisplayButtonSpam";
        }
        return null;
    }

    if (show.score) {
        const score = libCommon.getScoreByHdr(headers, localStorage.header);

        browser.spamHeaders
            .setHeaderHidden(tab.windowId, tab.index, "expandedRspamdSpamnessRow", (score === null));

        if (score === null) {
            browser.spamHeaders.setHeaderValue(
                tab.windowId, tab.index,
                "expandedRspamdSpamnessRow", "headerValue", ""
            );
            return;
        }

        const {fuzzySymbolsCount, parsed} = libHeader.parseHeaders(symbols);
        parsed.score = score;

        const fuzzyCounter = (fuzzySymbolsCount > 1)
            ? "{" + fuzzySymbolsCount + "}"
            : "";

        const hdrVal = {
            bayes: parsed.bayes +
                (parsed.bayesOptions ? " [" + parsed.bayesOptions + "%]" : "") +
                ", Fuzzy" + fuzzyCounter + ":",
            fuzzy: parsed.fuzzy + " )",
            score: parsed.score + " ( Bayes:"
        };

        for (const key in id.score.hdr) {
            if (!{}.hasOwnProperty.call(id.score.hdr, key)) continue;
            browser.spamHeaders.setHeaderValue(
                tab.windowId, tab.index, id.score.hdr[key].icon,
                "src", libCommon.getImageSrc(parsed[key])
            );
            browser.spamHeaders.setHeaderValue(
                tab.windowId, tab.index, id.score.hdr[key].score,
                "headerValue", hdrVal[key]
            );
        }

        let scanTime = headers["x-rspamd-scan-time"] || null;
        if (!scanTime || !scanTime[0].length) {
            scanTime = headers["x-spam-scan-time"] || [""];
        }
        const scanTimeStr = (scanTime[0].length)
            ? "Scan time: " + scanTime[0]
            : "";
        browser.spamHeaders
            .setHeaderValue(tab.windowId, tab.index, "rspamdSpamnessScanTimeHeader", "headerValue", scanTimeStr);

        const action = headers["x-rspamd-action"] || null;
        const actionStr = (action && action[0].length) ? action[0] : "";
        browser.spamHeaders
            .setHeaderValue(tab.windowId, tab.index, "rspamdSpamnessActionHeader", "headerValue", actionStr);
    }

    if (show.rules) {
        browser.spamHeaders
            .clearSymbolsHeader(tab.windowId, tab.index, localStorage["headers-show_n_lines"]);

        let noSymbols = true;
        const parsed_symbols = [];

        (function (a) {
            let parsed_symbol = [];
            let s = [];
            const re = /(\S+\(([^)]+)\))(\[.*?\])?/g;
            while ((parsed_symbol = re.exec(symbols)) !== null) {
                s = [];
                [, s.name, s.score, s.options] = parsed_symbol;
                a.push(s);
            }
        }(parsed_symbols));

        const symOrder = localStorage["headers-symbols_order"].toLowerCase();
        const compare = (symOrder === "name")
            ? function (a, b) {
                return a.name.localeCompare(b.name);
            }
            : function (a, b) {
                return Math.abs(a.score) < Math.abs(b.score);
            };

        const colorize_symbols = localStorage["headers-colorizeSymbols"];
        const group_symbols = localStorage["headers-group_symbols"];
        parsed_symbols
            .sort(function (a, b) {
                function group(s) {
                    if (s.score > 0) return 3;
                    if (s.score < 0) return 2;
                    if ((/^GREYLIST\(/).test(s.name)) return 1;
                    return 0;
                }

                if (group_symbols) {
                    if (group(a) < group(b)) return 1;
                    if (group(a) > group(b)) return -1;
                }
                return compare(a, b);
            })
            .forEach((s) => {
                browser.spamHeaders.addSymbol(
                    tab.windowId, tab.index, ((colorize_symbols ? getMetricClass(s.name) : null) || ""),
                    s.name, s.options
                );
                noSymbols = false;
            });

        browser.spamHeaders.setHeaderHidden(tab.windowId, tab.index, "expandedRspamdSpamnessRulesRow", noSymbols);
    }
};

messageHeader.updateHeaders = function () {
    browser.tabs.query({active: true}).then((tabs) => {
        tabs.forEach(function (tab) {
            browser.messageDisplay.getDisplayedMessage(tab.id).then((message) => {
                browser.messages.getFull(message.id).then(async (messagepart) => {
                    const {headers} = messagepart;
                    if (headers) await messageHeader.displayHeaders(true, tab, message, headers);
                }).catch((e) => libBackground.error(e));
            }).catch((e) => libBackground.error(e));
        });
    });
};
