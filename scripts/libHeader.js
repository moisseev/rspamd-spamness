/* global libCommon */

"use strict";

const libHeader = {};

libHeader.getSymbols = function (headers, header, XPC, window) {
    function b64DecodeUnicode(str) {
        // atob is not defined in Experiments environment
        const b64Decode = typeof atob === "undefined" ? window.atob : atob;

        return decodeURIComponent(b64Decode(str).split("").map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(""));
    }

    function getHeaderStr(headerName) {
        if (!XPC) return headers[headerName] || null;

        const headerStr = headers.getStringProperty(headerName);
        return headerStr ? [headerStr] : null;
    }

    function getUserHeaderStr() {
        let headerStr = null;

        const userHeaders = libCommon.getUserHeaders(header);
        userHeaders.some(function (headerName) {
            if (!headerName) return false;

            headerStr = getHeaderStr(headerName);
            return headerStr && ((/: \S+ \[[-\d.]+ \/ [-\d.]+\]/).test(headerStr[0]));
        });
        return headerStr;
    }

    // Get symbols from milter header
    libHeader.headerStr = getUserHeaderStr() || getHeaderStr("x-spamd-result");
    if (libHeader.headerStr) {

        /*
         * const converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
         *     .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
         * converter.charset = "UTF-8";
         * libHeader.headerStr = converter.ConvertToUnicode(libHeader.headerStr);
         */
        const m = libHeader.headerStr[0].match(/: \S+ \[[-\d.]+ \/ [-\d.]+\] *(.*)$/);
        if (m) {
            return m[1];
        }
    }

    // Get symbols from Haraka header
    libHeader.headerStr = getHeaderStr("x-rspamd-report");
    if (libHeader.headerStr) {
        const s = libHeader.headerStr[0].match(/\S/).input;
        if (s) {
            return libHeader.headerStr[0];
        }
    }

    // Get symbols from Exim header
    libHeader.headerStr = getHeaderStr("x-spam-report");
    if (libHeader.headerStr) {
        const m = libHeader.headerStr[0].match(/^Action: [ a-z]+?(Symbol: .*)Message-ID:/);
        if (m) {
            return m[1];
        }
    }

    // Get symbols from LDA mode header
    libHeader.headerStr = getHeaderStr("x-spam-result");
    if (libHeader.headerStr) {
        libHeader.headerStr[0] = b64DecodeUnicode(libHeader.headerStr[0], window);
        const json = JSON.parse(libHeader.headerStr[0]);
        const metric = json.symbols || json.default;
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
            return s;
        }
    }

    return null;
};

libHeader.parseHeaders = function (symbols) {
    const parsed = [];

    const b = symbols.match(/BAYES_(?:HAM|SPAM)\((([-])?[\d.]+)\)(?:\[([^\]]+?)%\])?/);
    parsed.bayes = (b) ? b[1] : "undefined";
    parsed.bayesOptions = (b && b[3]) ? (b[2] || "") + b[3] : "";

    const re = /FUZZY_(?:WHITE|PROB|DENIED|UNKNOWN)\(([-\d.]+)\)/g;
    // eslint-disable-next-line no-useless-assignment
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
    return {fuzzySymbolsCount, parsed};
};
