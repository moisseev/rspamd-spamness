var Spamness = {};

Spamness._bundle = null;

Spamness.settings = {
    "COLUMN_SHOW_IMAGE_SHOW_TEXT": {
       "value": 0
    },
    "COLUMN_NO_IMAGE_SHOW_TEXT": {
        "value": 1
    },
    "COLUMN_SHOW_IMAGE_NO_TEXT": {
        "value": 2
    }
};

Spamness._getString = function(key) {
    // return Spamness._bundle.getString(key);
};

Spamness._getLabel = function(key) {
    // return Spamness._getString(key + ".label");
};

Spamness.onLoad = function() {
    // Spamness._bundle = document.getElementById("bundle_spamness");
};

Spamness.log = function(msg) {
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage(msg);
};

window.addEventListener("load", Spamness.onLoad, false);
