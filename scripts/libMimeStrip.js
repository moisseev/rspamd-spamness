"use strict";

/**
 * Strips bodies of non-text MIME parts from a raw RFC 2822 message,
 * leaving part headers intact. Used to reduce message size for Bayes
 * training requests sent to Rspamd.
 *
 * Parts whose encoded body is at most SMALL_PART_THRESHOLD bytes are kept
 * intact to preserve the exact #ps:N Bayes token (#ps:N ≤ 7). Larger parts
 * (#ps:N ≥ 8) have their body replaced with a one-byte base64 stub ("AA==")
 * so that at least a #ps:0 token is emitted, maintaining the overall token
 * count used for the classifier inclusion threshold. The stub is applied
 * regardless of the original Content-Transfer-Encoding: since the exact #ps:N
 * value is already sacrificed for large parts, a wrong-CTE stub is no worse
 * than no token at all.
 *
 * @param {string} rawText - Raw message text
 * @returns {string} Message with large non-text part bodies replaced by a minimal stub
 */

/*
 * Encoded body size limit; below this the body is kept as-is for exact #ps:N.
 * Targets #ps:7 as the preservation boundary (decoded size < e^8 ≈ 2981 bytes).
 * For base64 (the common case) 2981 decoded bytes ≈ 4025 encoded bytes including
 * line breaks, so 4096 provides a safe margin. Since body.length (encoded) is
 * always >= the decoded length, the threshold is conservative: it may keep some
 * N=8 parts intact, but will never incorrectly stub an N=7 part.
 */
const SMALL_PART_THRESHOLD = 4096;
// One decoded null byte in base64 — always produces a #ps:0 token
const BASE64_STUB = "AA==\n";
// eslint-disable-next-line no-unused-vars
const libMimeStrip = {
    stripNonTextBodies(rawText) {
        return processPart(rawText.replace(/\r\n/g, "\n"));
    }
};

function findHeaderBodySep(text) {
    const idx = text.indexOf("\n\n");
    if (idx === -1) return null;
    return {
        body: text.slice(idx + 2),
        headers: text.slice(0, idx),
        sep: "\n\n"
    };
}

function parseContentType(headers) {
    const m = headers.match(/(?:^|\n)Content-Type\s*:[ \t]*([\s\S]*?)(?=\r?\n(?![ \t])|$)/i);
    if (!m) return null;

    const value = m[1].replace(/\r?\n[ \t]+/g, " ").trim();
    const typeMatch = value.match(/^([^;\s]+)/);
    if (!typeMatch) return null;

    const type = typeMatch[1].toLowerCase();
    const bm = value.match(/;\s*boundary\s*=\s*(?:"([^"]*)"|([\S]+?)(?=\s*;|\s*$))/i);
    const boundary = bm ? (bm[1] ?? bm[2]) : null;

    return {boundary, type};
}

function isPreservedType(type) {
    return type.startsWith("text/") || type.startsWith("message/");
}

function processMultipart(body, boundary) {
    const delim = "--" + boundary;

    /*
     * Split body on every occurrence of the boundary delimiter.
     * Each segment[0] is the preamble; segment[i>0] is: (boundary-line-suffix) + part-content + trailing-\n
     * The last segment whose first line starts with "--" is the close-delimiter.
     */
    const segments = body.split(delim);

    if (segments.length < 2) return body;

    // preamble
    const out = [segments[0]];

    for (let i = 1; i < segments.length; i++) {
        const seg = segments[i];

        // Close-delimiter: text after "--boundary" begins with "--"
        if ((/^[ \t]*--/).test(seg)) {
            out.push(delim, seg);
            break;
        }

        // Regular delimiter line: everything up to (and including) the first \n
        const nlIdx = seg.indexOf("\n");
        if (nlIdx === -1) {
            out.push(delim, seg);
            break;
        }

        // e.g. "\n"
        const delimLineSuffix = seg.slice(0, nlIdx + 1);

        /*
         * Part content sits between the delimiter line and the trailing \n
         * that precedes the next delimiter.  Strip that trailing \n.
         */
        const afterDelimLine = seg.slice(nlIdx + 1);
        const partContent = afterDelimLine.endsWith("\n")
            ? afterDelimLine.slice(0, -1)
            : afterDelimLine;

        out.push(delim, delimLineSuffix, processPart(partContent), "\n");
    }

    return out.join("");
}

function processPart(content) {
    const parsed = findHeaderBodySep(content);
    if (!parsed) return content;

    const {headers, sep, body} = parsed;
    const ct = parseContentType(headers);

    // No Content-Type defaults to text/plain per RFC 2045
    if (!ct) return content;

    if (ct.type.startsWith("multipart/") && ct.boundary) return headers + sep + processMultipart(body, ct.boundary);

    // multipart/* without a usable boundary: return unchanged
    if (ct.type.startsWith("multipart/")) return content;

    if (!isPreservedType(ct.type)) {
        if (body.length <= SMALL_PART_THRESHOLD) return content;
        return headers + sep + BASE64_STUB;
    }

    return content;
}
