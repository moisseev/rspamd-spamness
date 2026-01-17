/* global browser, libBackground, libCommon, libHeader */

"use strict";

const messageHeader = {};

// Map to store fuzzy hash mappings: short hash (10 chars) -> full hash (128 chars)
messageHeader.fuzzyHashMap = new Map();

/**
 * Parse X-Rspamd-Fuzzy headers and build fuzzy hash map.
 * Supports both "override" mode (multiple headers) and "compat" mode (comma-separated in one header).
 * @param {Object} headers - Email headers object
 * @returns {void}
 */
messageHeader.parseFuzzyHashes = function (headers) {
    messageHeader.fuzzyHashMap.clear();

    const fuzzyHeaders = headers["x-rspamd-fuzzy"];
    if (!fuzzyHeaders) return;

    const fullHashes = [];
    fuzzyHeaders.forEach((header) => {
        // Split by comma and trim whitespace
        header.split(",").forEach((hash) => {
            const cleaned = hash.trim();
            // Full fuzzy hash is 128 hex characters
            if (cleaned && cleaned.length === 128 && (/^[0-9a-f]+$/i).test(cleaned)) {
                fullHashes.push(cleaned);
            }
        });
    });

    // Build map: first 10 chars -> full hash
    fullHashes.forEach((fullHash) => {
        const shortHash = fullHash.substring(0, 10);
        messageHeader.fuzzyHashMap.set(shortHash, fullHash);
    });
};

/**
 * Extract full fuzzy hashes for a FUZZY_* symbol based on its options.
 * @param {string} options - Symbol options string (e.g., "[1:d90d46da1f:1.00:bin,1:ca8de7e39a:1.00:txt]")
 * @returns {string[]} Array of full fuzzy hashes
 */
messageHeader.getFullFuzzyHashes = function (options) {
    if (!options) return [];

    const fullHashes = [];
    // Parse options format: flag:short_hash:weight:type
    const optionRegex = /\d+:([0-9a-f]{10}):[^,\]]+/gi;
    // eslint-disable-next-line no-useless-assignment
    let match = null;

    while ((match = optionRegex.exec(options)) !== null) {
        const [, shortHash] = match;
        const fullHash = messageHeader.fuzzyHashMap.get(shortHash);
        if (fullHash) fullHashes.push(fullHash);
    }

    return fullHashes;
};

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

    const specialSymbolsRe = /^(GREYLIST|SPAMTRAP)\(/;

    function getMetricClass(rule) {
        if (rule.match(specialSymbolsRe))
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

        let parsed = {
            bayes: NaN,
            fuzzy: NaN,
            score: score
        };
        // eslint-disable-next-line no-useless-assignment
        let hdrVal = {};

        if (symbols === null) {
            hdrVal = {
                bayes: "",
                fuzzy: "",
                score: Number.isNaN(score) ? "" : score.toString()
            };
        } else {
            const {fuzzySymbolsCount, parsed: p} = libHeader.parseHeaders(symbols);
            parsed = {...parsed, ...p};
            const fuzzyCounter = (fuzzySymbolsCount > 1)
                ? "{" + fuzzySymbolsCount + "}"
                : "";

            hdrVal = {
                bayes: parsed.bayes +
                    (parsed.bayesOptions ? " [" + parsed.bayesOptions + "%]" : "") +
                    ", Fuzzy" + fuzzyCounter + ":",
                fuzzy: parsed.fuzzy + " )",
                score: score + " ( Bayes:"
            };
        }

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

        let scanTime = headers["x-rspamd-scan-time"] ?? null;
        if (!scanTime?.[0]?.length) {
            scanTime = headers["x-spam-scan-time"] ?? [""];
        }
        const scanTimeStr = (scanTime?.[0]?.length)
            ? "Scan time: " + scanTime[0]
            : "";
        browser.spamHeaders
            .setHeaderValue(tab.windowId, tab.index, "rspamdSpamnessScanTimeHeader", "headerValue", scanTimeStr);

        const action = headers["x-rspamd-action"] ?? null;
        const actionStr = action?.[0] ?? "";
        browser.spamHeaders
            .setHeaderValue(tab.windowId, tab.index, "rspamdSpamnessActionHeader", "headerValue", actionStr);

        browser.spamHeaders
            .setHeaderValue(tab.windowId, tab.index, "rspamdSpamnessNotificationArea", "headerValue", "");

        browser.spamHeaders.setHeaderHidden(
            tab.windowId, tab.index, "expandedRspamdSpamnessRow",
            Number.isNaN(score) && symbols === null && !scanTimeStr && !actionStr
        );
    }

    if (show.rules && (symbols !== null)) {
        messageHeader.parseFuzzyHashes(headers);

        browser.spamHeaders
            .clearSymbolsHeader(tab.windowId, tab.index, localStorage["headers-show_n_lines"]);

        let noSymbols = true;
        const parsed_symbols = [];

        (function (a) {
            // eslint-disable-next-line no-useless-assignment
            let parsed_symbol = [];
            const re = /(\S+\(([^)]+)\))(\[.*?\])?/g;
            while ((parsed_symbol = re.exec(symbols)) !== null) {
                const s = [];
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
                    if ((specialSymbolsRe).test(s.name)) return 1;
                    return 0;
                }

                if (group_symbols) {
                    if (group(a) < group(b)) return 1;
                    if (group(a) > group(b)) return -1;
                }
                return compare(a, b);
            })
            .forEach((s) => {
                const fullFuzzyHashes = (/FUZZY_/).test(s.name)
                    ? messageHeader.getFullFuzzyHashes(s.options)
                    : [];

                browser.spamHeaders.addSymbol(
                    tab.windowId, tab.index, ((colorize_symbols ? getMetricClass(s.name) : null) || ""),
                    s.name, s.options, fullFuzzyHashes
                );
                noSymbols = false;
            });

        // Clear fuzzy hash map after symbols are created - hashes are already in DOM
        messageHeader.fuzzyHashMap.clear();

        browser.spamHeaders.setHeaderHidden(tab.windowId, tab.index, "expandedRspamdSpamnessRulesRow", noSymbols);
    }
};

messageHeader.updateHeaders = function () {
    browser.tabs.query({active: true}).then((tabs) => {
        const tabPromises = tabs.map((tab) => browser.messageDisplay.getDisplayedMessage(tab.id).then((message) => {
            if (!message) return null;
            return browser.messages.getFull(message.id).then(async (messagepart) => {
                if (messagepart?.headers) {
                    await messageHeader.displayHeaders(true, tab, message, messagepart.headers);
                }
            });
        }));

        Promise.allSettled(tabPromises).then((results) => {
            const failures = results.filter((r) => r.status === "rejected");
            if (failures.length > 0) {
                libBackground.error(`Failed to update ${failures.length} of ${results.length} tabs`);
                failures.forEach((f) => libBackground.error(f.reason));
            }
        });
    });
};
