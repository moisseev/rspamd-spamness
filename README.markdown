# Rspamd-spamness

This is a Thunderbird add-on that visualizes [Rspamd](https://rspamd.com) spam scores generated on the server-side and embedded in message headers.

![screenshot](https://cloud.githubusercontent.com/assets/2275981/12062734/4021734a-afb3-11e5-8558-626fedd797ee.png
"Rspamd-spamness adds a column to the thread pane (message list) and a header to the message pane. The size and saturation of a circle reflect larger or smaller spam scores.")

## Supported mail headers

The add-on utilizes the following headers:

- Extended Rspamd headers added by the [Rspamd proxy worker](https://rspamd.com/doc/workers/rspamd_proxy.html) (`X-Spamd-Result`);
- Headers added by [Haraka](http://haraka.github.io/plugins/rspamd) (`X-Rspamd-Score` and `X-Rspamd-Report`) from version 0.9.1;
- Headers added by Exim (`X-Spam-Score` and `X-Spam-Report`) from version 0.8.0.

To enable extended spam headers in the [Milter headers module](https://rspamd.com/doc/modules/milter_headers.html), add the following line to `local.d/milter_headers.conf`:

~~~
extended_spam_headers = true;
~~~

To enable headers in Exim, refer to the "Integration with Exim MTA" section of the [MTA integration](https://rspamd.com/doc/tutorials/integration.html) document.

To enable extended spam headers in [Rmilter](https://www.rspamd.com/rmilter) (deprecated), add the following line to `rmilter.conf`:

~~~
spamd {
...
        extended_spam_headers = yes;
};
~~~

### Third-party spam filters

The add-on (from version 0.9.0) also supports SpamAssassin-based spam filters (e.g., `SpamAssassin`, `MailScanner`). The support is limited to displaying the total message score in the column.

### Headers processing order

The add-on searches for a spam score header in the message until it finds a matched header name in this order: user-defined `Additional mail headers` (if specified in the `Advanced options`), then hardcoded default headers (`X-Spamd-Result`, `X-Spam-Score`, `X-Rspamd-Score`, `X-Spam-Status`, `X-MailScanner-SpamCheck`). If a matched header is found, the add-on does not continue looking for other headers even if it cannot find a score in the header.

## Installation

Where to get the add-on:

- You can download the [latest release](https://github.com/moisseev/rspamd-spamness/releases/latest) from the [Releases](https://github.com/moisseev/rspamd-spamness/releases) page.
- Versions reviewed by `moz://a` are available from the [Thunderbird Add-ons page](https://addons.thunderbird.net/thunderbird/addon/rspamd-spamness/).
- You can [create an XPI installer](#creating-xpi-installer) from the source code.

To use Rspamd-spamness, you will need to reindex folders that contain Rspamd-scored mail, as well as enable the `Spam score` column display for each folder. If you've installed Rspamd-spamness prior to setting up your accounts, you can ignore the rest of this section — you're all set.

### Re-indexing folders

To re-index a folder, select it and choose `Properties...` from the context or `Edit` menu. Then click the `Repair Folder` button. You will need to do this for every folder.

### Displaying the 'Spam score' column

To display the column in each folder, click the column picker and select the `Spam score` column, ensuring it's checked and the new column is visible. To apply it to all folders, click the column picker again, scroll to the bottom to `Apply columns to...`, then select `Folder and its children...` and choose the top folder for your account. The column has already been automatically added to the default columns set, but this won't affect existing folders.

## Training Rspamd

One of the methods for training Rspamd involves collecting emails in special IMAP folders and processing them with a script that calls `rspamc`.

You can enable toolbar buttons to move or copy messages to the training spam/ham folders on the add-on settings page.

![move_buttons](https://cloud.githubusercontent.com/assets/2275981/18813761/36a41136-830e-11e6-8cf0-a9dd7042cc8b.png)

You will also need to specify the locations of your training folders.

## Creating XPI installer

The `XPI` installation package is essentially a `ZIP` file with a different extension.

To create it, zip the contents of the add-on's directory (not the add-on directory itself) excluding hidden files and folders that begin with a period, and rename the ZIP file to have an `.xpi` extension (or simply drag and drop the ZIP into the `Add-ons Manager` tab).

The ZIP file should maintain the following structure:

~~~
rspamd-spamness-master.zip
├── chrome/
├── defaults/
├── chrome.manifest
├── install.rdf
└── ... (other files and directories)
~~~

And **not** this structure:

~~~
rspamd-spamness-master.zip
└── rspamd-spamness-master/
    ├── chrome/
    ├── defaults/
    ├── chrome.manifest
    ├── install.rdf
    └── ... (other files and directories)
~~~
