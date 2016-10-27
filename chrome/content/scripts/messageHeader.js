"use strict";

RspamdSpamness.Message = {};

RspamdSpamness.Message.displayHeaders = function() {
    const prefs = Services.prefs;

    var id = {
        score: {
            hdr: {
                score: {
                    icon:  "rspamdSpamnessScoreIcon",
                    score: "rspamdSpamnessScoreHeader"
                },
                bayes: {
                    icon:  "rspamdSpamnessBayesIcon",
                    score: "rspamdSpamnessBayesHeader"
                },
                fuzzy: {
                    icon:  "rspamdSpamnessFuzzyIcon",
                    score: "rspamdSpamnessFuzzyHeader"
                }
            }
        }
    };

    var el = {
        greyl: {
            row: getEl("expandedRspamdSpamnessGreylistRow"),
            hdr: getEl("expandedRspamdSpamnessGreylistHeader")
        },
        score: {
            row: getEl("expandedRspamdSpamnessRow")
        },
        rules: {
            row: getEl("expandedRspamdSpamnessRulesRow"),
            box: getEl("expandedRspamdSpamnessRulesBox")
        },
        scanTime: getEl("rspamdSpamnessScanTimeHeader")
    };

    var show = {
        greyl: getPref("extensions.rspamd-spamness.display.messageGreylist"),
        score: getPref("extensions.rspamd-spamness.display.messageScore"),
        rules: getPref("extensions.rspamd-spamness.display.messageRules")
    };

    function getEl(id) {
        return document.getElementById(id);
    }

    function getPref(prefName) {
        try {
            return prefs.getBoolPref(prefName);
        } catch (e) {
            RspamdSpamness.err(e);
        }
    }

    function getHeaderBody(msgHeaders, name) {
        let headerBody = [];
        if (name in msgHeaders) {
            msgHeaders[name].forEach(function(body) {
                if (body != null)
                    headerBody.push(body);
            });
        }
        return headerBody;
    };

    el.greyl.row.collapsed = true;
    el.score.row.collapsed = true;
    el.rules.row.collapsed = true;

    if (show.greyl) {
        const msg = gMessageDisplay.displayedMessage;
        if (msg.folder) {
            MsgHdrToMimeMessage(msg, null, function(aMsgHdr, aMimeMsg) {
                const greylistHeaders = getHeaderBody(aMimeMsg.headers, 'x-rmilter-greylist');
                el.greyl.row.collapsed = (greylistHeaders.length == 0);
                el.greyl.hdr.headerValue = greylistHeaders;
                el.greyl.hdr.valid = true;
            }, true, {
                partsOnDemand: true
            });
        };
    }

    if (!show.score && !show.rules)
        return;

    if (gDBView.msgFolder == null)
        return;

    var hdr = gDBView.msgFolder.GetMessageHeader(gDBView.getKeyAt(gDBView.currentlyDisplayedMessage));

    if (!hdr)
        return;

    var headerStr = RspamdSpamness.getHeaderStr(hdr);
    if (headerStr == null)
        return null;

    var match = headerStr.match(/: False \[[-\d\.]+ \/ [-\d\.]+\] *(.*)$/);
    if (match == null)
        return null;
        }
    displayScoreRulesHeaders();

    function displayScoreRulesHeaders() {
        if (show.score) {
            var parsed = [];
            parsed.score = RspamdSpamnessColumn.getScoreByHdr(hdr);
            el.score.row.collapsed = (parsed.score == null);

            if (parsed.score == null) {
                el.score.score.headerValue = "";
                return;
            }

            var match1 = headerStr.match(/BAYES_(HAM|SPAM)\(([-\d\.]+)\)(\[[^\]]+?\])?/);

            parsed.bayes = (match1)
                ? match1[2]
                : "undefined";
            parsed.bayesOptions = (match1 && match1[3])
                ? ' ' + match1[3]
                : '';

            var re = /FUZZY_(?:WHITE|PROB|DENIED|UNKNOWN)\(([-\d\.]+)\)/g;
            var fuzzySymbols = [];
            parsed.fuzzy = 0;
            var fuzzySymbolsCount = 0;
            while ((fuzzySymbols = re.exec(headerStr)) != null) {
                parsed.fuzzy += parseFloat(fuzzySymbols[1]);
                fuzzySymbolsCount++;
            }
            parsed.fuzzy = (parsed.fuzzy)
                ? +parseFloat(parsed.fuzzy).toFixed(10)
                : "undefined";

            var fuzzyCounter = (fuzzySymbolsCount > 1)
                ? "{" + fuzzySymbolsCount + "}"
                : "";

            var hdrVal = {
                score: parsed.score + " ( Bayes:",
                bayes: parsed.bayes + parsed.bayesOptions + ", Fuzzy" + fuzzyCounter + ":",
                fuzzy: parsed.fuzzy + " )"
            };

            for (var key in id.score.hdr) {
                getEl(id.score.hdr[key].icon).src = RspamdSpamness.getImageSrc(parsed[key]);
                getEl(id.score.hdr[key].score).headerValue = hdrVal[key];
            }

            const msg = gMessageDisplay.displayedMessage;
            if (msg.folder) {
                MsgHdrToMimeMessage(msg, null, function (aMsgHdr, aMimeMsg) {
                    const scanTime = getHeaderBody(aMimeMsg.headers, "x-rspamd-scan-time");
                    el.scanTime.headerValue = (scanTime.length)
                        ? "Scan time: " + scanTime
                        : "";
                }, true, {
                    partsOnDemand: true
                });
            };
        }

        if (show.rules) {
            if (el.rules.box.clearHeaderValues)
                el.rules.box.clearHeaderValues();

            var num    = 0;
            var rule   = [];
            var reRule = /(\S+\([^)]+\))(\[.*?\])?/g;
            while (rule = reRule.exec(match[1])) {
                el.rules.box.addLinkView({
                    displayText: rule[1],
                    tooltiptext: rule[2],
                    class:       RspamdSpamness.getMetricClass(rule[1])
                });
                num++;
            }

            if (num) {
                el.rules.box.buildViews();
            } else {
                el.rules.row.collapsed;
            }
        }
    }
};

RspamdSpamness.Message.onLoad = function() {
    var listener = {};
    listener.onStartHeaders = function() {};
    listener.onEndHeaders = function() {
        RspamdSpamness.Message.displayHeaders();
    };
    gMessageListeners.push(listener);
};

RspamdSpamness.Message.onUnload = function() {
    window.removeEventListener("load", RspamdSpamness.Message.onLoad, false);
    window.removeEventListener("unload", RspamdSpamness.Message.onUnload, false);
};

window.addEventListener("load", RspamdSpamness.Message.onLoad, false);
window.addEventListener("unload", RspamdSpamness.Message.onUnload, false);
