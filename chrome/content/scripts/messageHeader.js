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

    // Get symbols from Rmilter header
    RspamdSpamness.Message.headerStr = RspamdSpamness.getHeaderStr(hdr);
    if (RspamdSpamness.Message.headerStr) {

        const converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
            .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        RspamdSpamness.Message.headerStr = converter.ConvertToUnicode(RspamdSpamness.Message.headerStr);

        const s = RspamdSpamness.Message.headerStr.match(/: \S+ \[[-\d.]+ \/ [-\d.]+\] *(.*)$/);
        if (s) {
            displayScoreRulesHeaders(s[1]);
            return;
        }
    }

    // Get symbols from Exim header
    const msg = gMessageDisplay.displayedMessage;
    if (msg.folder) {
        MsgHdrToMimeMessage(msg, null, function (aMsgHdr, aMimeMsg) {
            RspamdSpamness.Message.headerStr = getHeaderBody(aMimeMsg.headers, "x-spam-report")[0];
            if (RspamdSpamness.Message.headerStr) {
                const s = RspamdSpamness.Message.headerStr.match(/^Action: [ a-z]+?(Symbol: .*)Message-ID:/);
                if (s)
                    displayScoreRulesHeaders(s[1]);
            }
        }, true, {
            partsOnDemand: true
        });
    };

    return;

    function displayScoreRulesHeaders(symbols) {
        if (show.score) {
            var parsed = [];
            parsed.score = RspamdSpamnessColumn.getScoreByHdr(hdr);
            el.score.row.collapsed = (parsed.score == null);

            if (parsed.score == null) {
                el.score.score.headerValue = "";
                return;
            }

            const b = symbols.match(/BAYES_(?:HAM|SPAM)\(([-\d.]+)\)(\[[^\]]+?\])?/);
            parsed.bayes = (b) ? b[1] : "undefined";
            parsed.bayesOptions = (b && b[2]) ? " " + b[2] : "";

            var re = /FUZZY_(?:WHITE|PROB|DENIED|UNKNOWN)\(([-\d.]+)\)/g;
            var fuzzySymbols = [];
            parsed.fuzzy = 0;
            var fuzzySymbolsCount = 0;
            while ((fuzzySymbols = re.exec(symbols)) != null) {
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
            while (rule = reRule.exec(symbols)) {
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

RspamdSpamness.Message.openRulesDialog = function () {
    // Insert line breaks
    const re = /( +(?:(?:Symbol?: )?[^) ]+\)(?:\[[^\]]*\])?|Message-ID: [^ ]+?))/g;
    const content = RspamdSpamness.Message.headerStr.replace(re, "\n$1");

    window.openDialog(
        "chrome://rspamd-spamness/content/rspamdHeaders.xul", "",
        "chrome,modal,dialog,width=720,height=420,centerscreen,resizable",
        content
    );
}

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
