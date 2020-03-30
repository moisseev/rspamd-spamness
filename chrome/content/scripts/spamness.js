"use strict";

// eslint-disable-next-line no-var
var RspamdSpamness = {
    // Headers to search for total score in
    scoreHeaders: [
        "x-spamd-result",
        "x-spam-score",
        "x-rspamd-score",
        "x-spam-status",
        "x-mailscanner-spamcheck"
    ],
    trainingButtonHamDefaultAction:  "move",
    trainingButtonSpamDefaultAction: "move"
};

Components.utils.import("resource://gre/modules/AddonManager.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

RspamdSpamness.getImageSrc = function (normalized) {
    let img = null;
    let level = null;
    if (isNaN(normalized)) {
        img = "chrome://messenger/skin/icons/symbol-null.png";
    } else if (normalized < 0) {
        level = Math.round(Math.log(Math.abs(normalized) + 1));
        level = (level >= 5) ? 4 : level;
        img = "chrome://rspamd-spamness/skin/ham" + level + ".png";
    } else {
        level = Math.round(Math.log(normalized + 1));
        level = (level >= 5) ? 4 : level;
        img = "chrome://rspamd-spamness/skin/spam" + level + ".png";
    }
    return img;
};

RspamdSpamness.getMetricClass = function (rule) {
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
};

function getUserHeaders() {
    const chdrs = Services.prefs.getCharPref("extensions.rspamd-spamness.header").trim().toLowerCase();
    return (chdrs === "")
        ? []
        : chdrs.split(", ");
}

RspamdSpamness.getHeaderStr = function (hdr) {
    let headerStr = null;
    const userHeaders = getUserHeaders();
    userHeaders.some(function (headerName) {
        if (!headerName) return false;
        headerStr = hdr.getStringProperty(headerName);
        return ((/: \S+ \[[-\d.]+ \/ [-\d.]+\]/).test(headerStr));
    });
    return headerStr || hdr.getStringProperty("x-spamd-result") || null;
};

RspamdSpamness.getScoreByHdr = function (hdr) {
    const re = [
        // X-Spamd-Result: Rspamd (milter)
        /: \S+ \[([-\d.]+?) \//,
        // X-Spam-Score: Rspamd (Exim, LDA) , SpamAssassin
        /^([-\d.]+?)(?: [(/]|$)/,
        // X-Spam-Status: SpamAssassin, X-MailScanner-SpamCheck: MailScanner
        /(?:, | [(])score=([-\d.]+?)(?:[, ]|$)/
    ];

    const userHeaders = getUserHeaders();
    let score = Number.NaN;
    [...userHeaders, ...RspamdSpamness.scoreHeaders].some(function (headerName) {
        const headerStr = hdr.getStringProperty(headerName);
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

// eslint-disable-next-line max-lines-per-function
RspamdSpamness.syncHeaderPrefs = function (prefVal) {
    const {prefs} = Services;
    const customHeaders = getHeadersPref("mailnews.customHeaders", /\s*:\s*/);
    const curUserHeaders = getUserHeaders();
    const newUserHeaders = prefVal.toLowerCase().split(/, */);

    if (prefVal !== "") {
        const valid = newUserHeaders.every(function (h) {
            return isRFC5322HeaderName(h);
        });
        if (!valid) {
            showAlert("bundle_custom", "colonInHeaderName");
            return false;
        }
    }

    const curHeaders = [...RspamdSpamness.scoreHeaders, ...curUserHeaders];
    const newHeaders = [...RspamdSpamness.scoreHeaders, ...newUserHeaders];

    const {nsMsgSearchAttrib} = Components.interfaces;
    if (customHeaders.length - curHeaders.length + newHeaders.length >=
            (nsMsgSearchAttrib.kNumMsgSearchAttributes - nsMsgSearchAttrib.OtherHeader - 1)) {
        showAlert("bundle_filter", "customHeaderOverflow");
        return false;
    }

    setHeadersPref("mailnews.customHeaders", customHeaders, ": ", curUserHeaders, newHeaders);
    prefs.setCharPref("extensions.rspamd-spamness.header", newUserHeaders.join(", "));

    // flush to disk
    prefs.savePrefFile(null);
    return true;

    function getHeadersPref(prefName, separator) {
        const chdrs = prefs.getCharPref(prefName).trim();
        return (chdrs === "")
            ? []
            : chdrs.split(separator);
    }

    function isRFC5322HeaderName(str) {
        return (/^[\x21-\x39\x3B-\x7E]+$/).test(str);
    }

    function setHeadersPref(prefName, arr, separator, rmvHeaders, addHeaders) {
        const h = {
            add: addHeaders,
            rmv: rmvHeaders
        };
        let modified = null;
        if (typeof h.rmv === "string")
            h.rmv = [h.rmv];
        if (typeof h.add === "string")
            h.add = [h.add];

        h.rmv.forEach(function (hdr) {
            const i = arr.indexOf(hdr);
            if (i >= 0 && h.add.indexOf(hdr) === -1) {
                arr.splice(i, 1);
                modified = true;
            }
        });
        h.add.forEach(function (hdr) {
            // Skip empty strings
            if (!hdr) return;
            if (arr.indexOf(hdr) === -1) {
                arr.push(hdr);
                modified = true;
            }
        });
        if (modified) {
            const newPref = arr.join(separator);
            prefs.setCharPref(prefName, newPref);
        }
    }

    function showAlert(strBundleId, strId) {
        const bundle = document.getElementById(strBundleId);
        const alertText = bundle.getString(strId);
        window.alert(alertText);
        const prefEl = document.getElementById("headerNameForm");
        if (prefEl) prefEl.focus();
    }
};

RspamdSpamness.log = function (msg) {
    Services.console.logStringMessage(msg);
};

RspamdSpamness.err = function (msg) {
    Services.console.logStringMessage("ERROR: " + msg);
};

RspamdSpamness.addSpamnessColumn = function () {
    // from chrome://messenger/content/folderDisplay.js
    const fdw = FolderDisplayWidget.prototype;
    fdw.DEFAULT_COLUMNS.push("spamScoreCol");
    fdw.COLUMN_DEFAULT_TESTERS.spamScoreCol = function (viewWrapper) {
        return viewWrapper.isIncomingFolder;
    };
};

RspamdSpamness.openTab = function (url) {
    let tabmail = document.getElementById("tabmail");
    if (!tabmail) {
        const mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
        if (mail3PaneWindow) {
            tabmail = mail3PaneWindow.document.getElementById("tabmail");
            mail3PaneWindow.focus();
        }
    }

    if (tabmail)
        tabmail.openTab("contentTab", {contentPage: url});
    else
        window.openDialog(
            "chrome://messenger/content/", "_blank",
            "chrome,dialog=no,all", null,
            {
                tabParams: {contentPage: url},
                tabType:   "contentTab"
            }
        );
};

RspamdSpamness.greet = function () {
    const greetPage = "chrome://rspamd-spamness/content/installed.xul";
    RspamdSpamness.openTab(greetPage);
};

RspamdSpamness.getFolderURI = function (account, folder) {
    const prefServiceBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService).getBranch("");
    let accountPref = "extensions.rspamd-spamness." + account.key + ".uri.folder" + folder;
    let isDefault = false;

    // Use default URI if account preference doesn't exist
    if (!prefServiceBranch.getPrefType(accountPref)) {
        accountPref = "extensions.rspamd-spamness.uri.folder" + folder;
        isDefault = true;
    }

    const URI = prefServiceBranch.getPrefType(accountPref) ? Services.prefs.getCharPref(accountPref) : "";
    return {
        URI:       URI,
        isDefault: isDefault
    };
};

RspamdSpamness.moveMessage = function (folder, isDefault) {
    function findAccountFromFolder() {
        const theFolder = gMessageDisplay.displayedMessage.folder;

        if (!theFolder)
            return null;

        const {accounts} = Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);

        for (let i = 0; i < accounts.length; i++) {
            const account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
            if (account.incomingServer.rootFolder === theFolder.rootFolder) return account;
        }
        return null;
    }

    const {URI} = RspamdSpamness.getFolderURI(findAccountFromFolder(), folder);
    if (!URI) {
        window.alert("Folder location is not set.");
        return;
    }
    const destination = MailUtils.getExistingFolder(URI);
    if (
        folder === "TrainHam" && (
            isDefault && RspamdSpamness.trainingButtonHamDefaultAction === "copy" ||
            !isDefault && RspamdSpamness.trainingButtonHamDefaultAction !== "copy"
        ) ||
        folder === "TrainSpam" && (
            isDefault && RspamdSpamness.trainingButtonSpamDefaultAction === "copy" ||
            !isDefault && RspamdSpamness.trainingButtonSpamDefaultAction !== "copy"
        )
    )
        MsgCopyMessage(destination);
    else
        MsgMoveMessage(destination);
};

RspamdSpamness.setBtnCmdLabels = function () {
    function setLabel(id, label) {
        const el = document.getElementById(id);
        if (el)
            el.setAttribute("label", label);
    }

    RspamdSpamness.trainingButtonHamDefaultAction =
        Services.prefs.getCharPref("extensions.rspamd-spamness.trainingButtonHam.defaultAction");
    if (RspamdSpamness.trainingButtonHamDefaultAction === "copy") {
        setLabel("btnHamCmdPrimary", "Copy");
        setLabel("btnHamCmdSecondary", "Move");
    } else {
        setLabel("btnHamCmdPrimary", "Move");
        setLabel("btnHamCmdSecondary", "Copy");
    }

    RspamdSpamness.trainingButtonSpamDefaultAction =
        Services.prefs.getCharPref("extensions.rspamd-spamness.trainingButtonSpam.defaultAction");
    if (RspamdSpamness.trainingButtonSpamDefaultAction === "copy") {
        setLabel("btnSpamCmdPrimary", "Copy");
        setLabel("btnSpamCmdSecondary", "Move");
    } else {
        setLabel("btnSpamCmdPrimary", "Move");
        setLabel("btnSpamCmdSecondary", "Copy");
    }
};

RspamdSpamness.hideTrnButtons = function () {
    const hide = !Services.prefs.getBoolPref("extensions.rspamd-spamness.trainingButtons.enabled");
    const elements = document.getElementsByClassName("trn");
    for (let i = 0; i < elements.length; i++) {
        elements[i].hidden = hide;
    }
};

RspamdSpamness.setTheme = function () {

    /**
     * Determine whether the color is light or dark.
     * (idea from https://awik.io/determine-color-bright-dark-using-javascript/)
     * @param {string} - Hex or RGB color code
     * @returns {sring} - Color brightness ("light" or "dark").
     */
    function lightOrDark(color) {
        const c = color.trim();
        let rgb = [];

        if (c.match(/^rgb/)) {
            rgb = c.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d?(?:\.\d+)?))?\)$/);
        } else if (c.match(/^#(?:[a-f0-9]{3}){1,2}$/i)) {
            // Convert HEX to RGB: https://gist.github.com/jed/983661
            const hex = Number("0x" + c.slice(1).replace(c.length > 4 && /./g, "$&$&"));
            // eslint-disable-next-line no-bitwise
            rgb = [hex >> 16, hex >> 8 & 255, hex & 255];
        } else {
            if (c !== "-moz-dialog") {
                RspamdSpamness.err("Unsupported color value format: " + color);
            }
            return "light";
        }

        const [, r, g, b] = rgb;
        // HSP Color Model equation from http://alienryderflex.com/hsp.html
        const brightness = Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
        if (brightness < 127.5) return "dark";
        return "light";
    }

    const o = window.getComputedStyle(document.documentElement);
    const theme = lightOrDark(o.getPropertyValue("--toolbar-bgcolor"));
    document.documentElement.setAttribute("data-theme", theme);
};
