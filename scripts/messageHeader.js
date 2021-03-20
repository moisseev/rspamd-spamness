/* global browser, libBackground, libCommon */

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

    function b64DecodeUnicode(str) {
        return decodeURIComponent(atob(str).split("").map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(""));
    }

    // TB doesn't recalculate header height if it is already set.
    browser.spamHeaders.removeHeight(tab.id, "expandedHeaderView");

    if (!show.score && !show.rules)
        return;

    // Get symbols from milter header
    messageHeader.headerStr = await libBackground.getHeaderStr(headers);
    if (messageHeader.headerStr) {

        /*
         * const converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
         *     .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
         * converter.charset = "UTF-8";
         * messageHeader.headerStr = converter.ConvertToUnicode(messageHeader.headerStr);
         */
        const m = messageHeader.headerStr[0].match(/: \S+ \[[-\d.]+ \/ [-\d.]+\] *(.*)$/);
        if (m) {
            displayScoreRulesHeaders(headers, m[1]);
            return;
        }
    }

    // Get symbols from Haraka header
    messageHeader.headerStr = headers["x-rspamd-report"] || null;
    if (messageHeader.headerStr) {
        const s = messageHeader.headerStr[0].match(/\S/).input;
        if (s) {
            displayScoreRulesHeaders(headers, messageHeader.headerStr[0]);
            return;
        }
    }

    // Get symbols from Exim header
    messageHeader.headerStr = headers["x-spam-report"] || null;
    if (messageHeader.headerStr) {
        const m = messageHeader.headerStr[0].match(/^Action: [ a-z]+?(Symbol: .*)Message-ID:/);
        if (m) {
            displayScoreRulesHeaders(headers, m[1]);
            return;
        }
    }

    // Get symbols from LDA mode header
    messageHeader.headerStr = headers["x-spam-result"] || null;
    if (messageHeader.headerStr) {
        messageHeader.headerStr[0] = b64DecodeUnicode(messageHeader.headerStr[0]);
        const metric = JSON.parse(messageHeader.headerStr[0]).default;
        let s = "";
        for (const item in metric) {
            if (!{}.hasOwnProperty.call(metric, item)) continue;
            const symbol = metric[item];
            if (symbol.name) {
                s += " " + symbol.name +
                    "(" + symbol.score.toFixed(2) + ")" +
                    "[" + (symbol.options ? symbol.options.join(", ") : "") + "]";
            }
        }
        if (s) {
            displayScoreRulesHeaders(headers, s);
        }
    }

    function displayScoreRulesHeaders(hdr, symbols) {
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
            const parsed = [];
            parsed.score = libCommon.getScoreByHdr(hdr, localStorage.header);
            browser.spamHeaders
                .setHeaderHidden(tab.id, "expandedRspamdSpamnessRow", (parsed.score === null));

            if (parsed.score === null) {
                browser.spamHeaders.setHeaderValue(tab.id, "expandedRspamdSpamnessRow", "headerValue", "");
                return;
            }

            const b = symbols.match(/BAYES_(?:HAM|SPAM)\(([-\d.]+)\)(\[[^\]]+?\])?/);
            parsed.bayes = (b) ? b[1] : "undefined";
            parsed.bayesOptions = (b && b[2]) ? " " + b[2] : "";

            const re = /FUZZY_(?:WHITE|PROB|DENIED|UNKNOWN)\(([-\d.]+)\)/g;
            let fuzzySymbols = [];
            parsed.fuzzy = 0;
            let fuzzySymbolsCount = 0;
            while ((fuzzySymbols = re.exec(symbols)) !== null) {
                parsed.fuzzy += parseFloat(fuzzySymbols[1]);
                fuzzySymbolsCount++;
            }
            parsed.fuzzy = (parsed.fuzzy)
                ? Number(parseFloat(parsed.fuzzy).toFixed(10))
                : "undefined";

            const fuzzyCounter = (fuzzySymbolsCount > 1)
                ? "{" + fuzzySymbolsCount + "}"
                : "";

            const hdrVal = {
                bayes: parsed.bayes + parsed.bayesOptions + ", Fuzzy" + fuzzyCounter + ":",
                fuzzy: parsed.fuzzy + " )",
                score: parsed.score + " ( Bayes:"
            };

            for (const key in id.score.hdr) {
                if (!{}.hasOwnProperty.call(id.score.hdr, key)) continue;
                browser.spamHeaders.setHeaderValue(
                    tab.id, id.score.hdr[key].icon,
                    "src", libCommon.getImageSrc(parsed[key])
                );
                browser.spamHeaders.setHeaderValue(
                    tab.id, id.score.hdr[key].score,
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
                .setHeaderValue(tab.id, "rspamdSpamnessScanTimeHeader", "headerValue", scanTimeStr);
        }

        if (show.rules) {
            browser.spamHeaders
                .clearSymbolsHeader(tab.id, localStorage["headers-show_n_lines"]);

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
            })(parsed_symbols);

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
                        tab.id, ((colorize_symbols ? getMetricClass(s.name) : null) || ""),
                        s.name, s.options
                    );
                    noSymbols = false;
                });

            browser.spamHeaders.setHeaderHidden(tab.id, "expandedRspamdSpamnessRulesRow", noSymbols);
        }
    }
};

messageHeader.updateHeaders = function () {
    browser.tabs.query({active: true}).then((tabs) => {
        tabs.forEach(function (tab) {
            browser.messageDisplay.getDisplayedMessage(tab.id).then((message) => {
                browser.messages.getFull(message.id).then(async (messagepart) => {
                    const {headers} = messagepart;
                    if (headers) await messageHeader.displayHeaders(true, tab, message, headers);
                });
            });
        });
    });
};
