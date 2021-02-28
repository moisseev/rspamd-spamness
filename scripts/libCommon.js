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

libCommon.getImageSrc = function (normalized) {
    let img = null;
    let level = null;
    if (isNaN(normalized)) {
        img = "images/symbol-null.png";
    } else if (normalized < 0) {
        level = Math.round(Math.log(Math.abs(normalized) + 1));
        level = (level >= 5) ? 4 : level;
        img = "images/ham" + level + ".png";
    } else {
        level = Math.round(Math.log(normalized + 1));
        level = (level >= 5) ? 4 : level;
        img = "images/spam" + level + ".png";
    }
    return img;
};

libCommon.getUserHeaders = function (header) {
    const chdrs = header.trim().toLowerCase();
    return (chdrs === "")
        ? []
        : chdrs.split(", ");
};

/**
 * Get message score from the message headers object.
 * Returns NaN if a header or message score not found.
 *
 * @param {object} hdr - Message headers object.
 * @param {string} header
 * @param {boolean} [XPC] - hdr is an XPConnect wrapped object
 * @returns {number} - Message score
 */
libCommon.getScoreByHdr = function (hdr, header, XPC) {
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
        re.some(function (regexp) {
            const parsed = regexp.exec(headerStr);
            if (parsed) {
                score = parseFloat(parsed[1]);
            }
            return parsed;
        });
        return true;
    });
    return score;
};
