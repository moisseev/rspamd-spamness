Rspamd-spamness
===============

This is a Thunderbird add-on for visualizing [Rspamd](https://rspamd.com) spam scores generated
on the server-side and embedded in message headers.

![screenshot](https://cloud.githubusercontent.com/assets/2275981/12062734/4021734a-afb3-11e5-8558-626fedd797ee.png
"Rspamd-spamness adds a column to the thread pane (message list) and a header to the message pane. The size and saturation of a circle reflects larger or smaller spam score.")

Rspamd-spamness is a fork of the [Spamness add-on](https://addons.mozilla.org/en-US/thunderbird/addon/spamness/) by Ryan Lee.

## Requirements

The add-on uses extended spamd headers added by [Rmilter](https://github.com/vstakhov/rmilter).
To enable extended spam headers add the following line to `rmilter.conf`:
~~~
spamd {
...
        extended_spam_headers = yes;
};
~~~

## Installation

This add-on is available from the [Mozilla Add-ons site]
(https://addons.mozilla.org/en-US/thunderbird/addon/rspamd-spamness/).

To use Rspamd-spamness, you'll need to both re-build folder indices for folders that contain Rspamd-scored mail and enable the `Spam score` column display for each folder.  If you've installed Rspamd-spamness ahead of setting up any of your accounts, you can completely ignore the rest of this section - you're all set.

### Re-indexing folders
To re-index a folder, select it and choose `Properties...` from the context or `Edit` menu, then click the `Repair Folder` button.  You will need to do this for every folder.

### Displaying the 'Spam score' column
To display the column in each folder, click the column picker and select the `Spam score` column, making sure it's checked and the new column is visible.  To apply it to all folders, click the column picker again, scrolling to the bottom to `Apply columns to...`, then `Folder and its children...` and choose the top folder for your account.  The column has already been automatically added to the default columns set, but this doesn't affect existing folders.
