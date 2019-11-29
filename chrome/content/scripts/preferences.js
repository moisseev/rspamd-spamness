/* global Preferences:readonly */

"use strict";

Preferences.addAll([
    {id: "extensions.rspamd-spamness.display.column", type: "int"},
    {id: "extensions.rspamd-spamness.display.columnImageOnlyForPositive", type: "bool"},
    {id: "extensions.rspamd-spamness.isDefaultColumn", type: "bool"},
    {id: "extensions.rspamd-spamness.display.messageScore", type: "bool"},
    {id: "extensions.rspamd-spamness.display.messageRules", type: "bool"},
    {id: "extensions.rspamd-spamness.headers.show_n_lines_before_more", type: "int"},
    {id: "extensions.rspamd-spamness.headers.colorizeSymbols", type: "bool"},
    {id: "extensions.rspamd-spamness.display.messageGreylist", type: "bool"},
    {id: "extensions.rspamd-spamness.trainingButtons.enabled", type: "bool"},
    {id: "extensions.rspamd-spamness.uri.folderTrainHam", type: "string"},
    {id: "extensions.rspamd-spamness.uri.folderTrainSpam", type: "string"},
    {id: "extensions.rspamd-spamness.trainingButtonHam.defaultAction", type: "string"},
    {id: "extensions.rspamd-spamness.trainingButtonSpam.defaultAction", type: "string"},
]);
