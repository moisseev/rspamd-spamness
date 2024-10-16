"use strict";

// eslint-disable-next-line no-var
var libCommon = {
    // Headers to search for message score in
    scoreHeaders: [
        "x-spamd-result",
        "x-spam-score",
        "x-rspamd-score",
        "x-spam-status",
        "x-mailscanner-spamcheck"
    ]
};

libCommon.warn = function (msg) {
    // eslint-disable-next-line no-console
    console.warn(msg);
};

libCommon.getImageSrc = function (normalized, id) {
    // eslint-disable-next-line no-useless-assignment
    let img = null;
    // eslint-disable-next-line no-useless-assignment
    let level = null;
    if (isNaN(normalized)) {
        img = "symbol-null";
    } else if (normalized < 0) {
        level = Math.round(Math.log(Math.abs(normalized) + 1));
        level = (level >= 5) ? 4 : level;
        img = "ham" + level;
    } else {
        level = Math.round(Math.log(normalized + 1));
        level = (level >= 5) ? 4 : level;
        img = "spam" + level;
    }
    return id ? img : "images/" + img + ".png";
};

libCommon.getUserHeaders = function (header) {
    const chdrs = header.trim().toLowerCase();
    return (chdrs === "")
        ? []
        : chdrs.split(", ");
};

/**
 * Decode a MIME-encoded header.
 * Supports 'Q' (quoted-printable) and 'B' (base64) encodings with UTF-8 charset.
 * If an unsupported charset or encoding is encountered, the original value is returned.
 *
 * @param {string} headerValue - The MIME-encoded header value to decode.
 * @param {object} [window] - Global window object, used for base64 decoding in Experiments environment.
 * @returns {string} - The decoded header value.
 */
libCommon.decodeMimeHeader = function (headerValue, window) {
    function decodeQuotedPrintable(str) {
        return str
            .replace(/_/g, " ")
            .replace(/[=]([0-9A-F]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
    }

    function decodeMimeWord(mimeWord) {
        const regex = /^=\?([^?]+)\?([^?]+)\?(.+?)\?=$/i;
        const match = mimeWord.match(regex);

        if (!match) return mimeWord;

        const [, charset, encoding, encodedText] = match;

        // atob is not defined in Experiments environment
        const b64Decode = typeof atob === "undefined" ? window.atob : atob;

        let decodedText = null;

        switch (encoding.toUpperCase()) {
            case "Q":
                decodedText = decodeQuotedPrintable(encodedText);
                break;
            case "B":
                decodedText = b64Decode(encodedText);
                break;
            default:
                libCommon.warn("Invalid MIME encoding (RFC 2047): " + encoding);
        }

        if (!decodedText) return mimeWord;

        if (charset.toUpperCase() !== "UTF-8") {
            libCommon.warn("Unsupported charset: " + charset);
            return decodedText;
        }

        // Convert to UTF-8 string
        return decodeURIComponent(escape(decodedText));
    }

    return headerValue
        // Unfolding
        .replace(/[\r\n]+[\s]+/g, "")
        // Find and decode encoded words, removing any spaces between them
        .replace(/(=\?[^?]+\?[^?]+\?[^?]+\?=)(\s+)?/gi, (_, encodedWord) => decodeMimeWord(encodedWord));
};

/**
 * Get message score from the message headers object.
 * Returns NaN if a header or message score not found.
 *
 * @param {object} hdr - Message headers object.
 * @param {string} header
 * @param {boolean} [XPC] - hdr is an XPConnect wrapped object
 * @param {object} [window] - Global window object, used for base64 decoding in Experiments environment
 * @returns {number} - Message score
 */
libCommon.getScoreByHdr = function (hdr, header, XPC, window) {
    const re = [
        // X-Spamd-Result: Rspamd (milter)
        /: \S+ \[([-\d.]+?) \//,
        // X-Spam-Score: Rspamd (Exim, LDA) , SpamAssassin
        /^([-\d.]+?)(?: [(/]|$)/,
        // X-Spam-Status: SpamAssassin, X-MailScanner-SpamCheck: MailScanner
        /(?:, | [(])score=([-\d.]+?)(?:[, ]|$)/
    ];

    const userHeaders = libCommon.getUserHeaders(header);
    let score = Number.NaN;
    [...userHeaders, ...libCommon.scoreHeaders].some(function (headerName) {
        const headerStr = XPC ? hdr.getStringProperty(headerName) : hdr[headerName];
        if (!headerStr) return false;
        const decodedHeader = XPC ? libCommon.decodeMimeHeader(headerStr, window) : headerStr;
        re.some(function (regexp) {
            const parsed = regexp.exec(decodedHeader);
            if (parsed) {
                score = parseFloat(parsed[1]);
            }
            return parsed;
        });
        return true;
    });
    return score;
};
