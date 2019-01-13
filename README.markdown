Rspamd-spamness
===============

This is a Thunderbird add-on for visualizing [Rspamd](https://rspamd.com) spam scores generated
on the server-side and embedded in message headers.

![screenshot](https://cloud.githubusercontent.com/assets/2275981/12062734/4021734a-afb3-11e5-8558-626fedd797ee.png
"Rspamd-spamness adds a column to the thread pane (message list) and a header to the message pane. The size and saturation of a circle reflects larger or smaller spam score.")

## Supported mail headers

The add-on uses extended Rspamd headers added by [Rspamd proxy worker](https://rspamd.com/doc/workers/rspamd_proxy.html) (`X-Spamd-Result`) and (from version 0.8.0) headers added by Exim (`X-Spam-Score` and `X-Spam-Report`).

To enable extended spam headers in [Milter headers module](https://rspamd.com/doc/modules/milter_headers.html) add the following line to `local.d/milter_headers.conf`:
~~~
extended_spam_headers = true;
~~~
To enable headers in Exim refer to the "Integration with Exim MTA" section of [MTA integration](https://rspamd.com/doc/integration.html) document.

To enable extended spam headers in [Rmilter](https://www.rspamd.com/rmilter/) (deprecated) add the following line to `rmilter.conf`:
~~~
spamd {
...
        extended_spam_headers = yes;
};
~~~

### Third-party spam filters

The add-on (from version 0.9.0) also supports SpamAssassin-based spam filters (e.g. `SpamAssassin`, `MailScanner`). The support is limited to displaying the total message score in the column.

### Headers processing order

The add-on looks for a spam score header in the message until it finds a matched header name in this order: user-defined `Additional mail headers` (if specified in the `Advanced options`), then hardcoded default headers (`X-Spamd-result`, `X-Spam-Score`, `X-Spam-Status`, `X-MailScanner-SpamCheck`). If a matched header is found the add-on does not try other headers even it cannot find score in the header.

## Installation

This add-on is available from the [Mozilla Add-ons site]
(https://addons.mozilla.org/en-US/thunderbird/addon/rspamd-spamness/).

To use Rspamd-spamness, you'll need to both re-build folder indices for folders that contain Rspamd-scored mail and enable the `Spam score` column display for each folder.  If you've installed Rspamd-spamness ahead of setting up any of your accounts, you can completely ignore the rest of this section - you're all set.

### Re-indexing folders
To re-index a folder, select it and choose `Properties...` from the context or `Edit` menu, then click the `Repair Folder` button.  You will need to do this for every folder.

### Displaying the 'Spam score' column
To display the column in each folder, click the column picker and select the `Spam score` column, making sure it's checked and the new column is visible.  To apply it to all folders, click the column picker again, scrolling to the bottom to `Apply columns to...`, then `Folder and its children...` and choose the top folder for your account.  The column has already been automatically added to the default columns set, but this doesn't affect existing folders.

## Training Rspamd

One of the training methods is collecting emails in special IMAP folders and processing them by script that call `rspamc`.

You can add toolbar buttons to move/copy messages to the training spam/ham folders in one click.
![move_buttons](https://cloud.githubusercontent.com/assets/2275981/18813761/36a41136-830e-11e6-8cf0-a9dd7042cc8b.png)

To add the buttons, you need to:
- right-click onto Thunderbird message pane header toolbar;
- select `Customize…`;
- the `Customize Toolbar` window will launch. From there you can drag-and-drop the buttons into your toolbar.

You also need to specify training folder location URIs in the add-on options. A folder URI can be found at `General Information` tab of the `Folder Properties`.

## Credits

Rspamd-spamness is a fork of the [Spamness add-on](https://addons.mozilla.org/en-US/thunderbird/addon/spamness/) by Ryan Lee.
