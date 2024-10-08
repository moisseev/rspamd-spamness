<img src="images/icon.svg" alt="Logo" align="right" height="48px" />

# Rspamd-spamness

**Rspamd-spamness** is a Thunderbird add-on that visualizes spam scores generated by [Rspamd](https://rspamd.com) on the server side, which are embedded in message headers.

## Introduction

The **Rspamd-spamness** add-on is designed primarily for mail system administrators who use Rspamd, a high-performance spam filtering system. This add-on provides a visual representation of spam scores, enabling administrators to monitor and manage spam filtering more effectively across their email services. While its main audience is mail system administrators, the add-on also assists email users in identifying potentially spammy emails by highlighting their assigned scores.

![Screenshot](https://github.com/user-attachments/assets/b0474846-7955-4ec3-9ca9-4a6068a4cc31
"Rspamd-spamness adds columns to the thread pane (message list) and a header to the message pane. The size and saturation of a circle reflect larger or smaller spam scores.")

## Supported mail headers

The add-on utilizes the following headers:

- **Extended Rspamd headers** added by the [Rspamd proxy worker](https://rspamd.com/doc/workers/rspamd_proxy.html) (`X-Spamd-Result`).
- **Headers added by [Haraka](http://haraka.github.io/plugins/rspamd)** (`X-Rspamd-Score` and `X-Rspamd-Report`).
- **Headers added by Exim** (`X-Spam-Score` and `X-Spam-Report`).

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

The add-on also supports SpamAssassin-based spam filters (e.g., `SpamAssassin`, `MailScanner`). This support is limited to displaying the total message score in the column.

### Headers processing order

The add-on searches for a spam score header in the message, following this order: user-defined `Additional mail headers` (if specified in the `Advanced options`), then hardcoded default headers (`X-Spamd-Result`, `X-Spam-Score`, `X-Rspamd-Score`, `X-Spam-Status`, `X-MailScanner-SpamCheck`). Once a matched header is found, the add-on will stop searching for additional headers, even if a score cannot be detected in the identified header.

## Installation

To install the **Rspamd-spamness** add-on, choose one of the following options:

- Download the [latest release](https://github.com/moisseev/rspamd-spamness/releases/latest) directly from the [Releases](https://github.com/moisseev/rspamd-spamness/releases) page.
- Access versions reviewed by `moz://a` on the [Thunderbird Add-ons page](https://addons.thunderbird.net/thunderbird/addon/rspamd-spamness/).
- If you need to install a specific commit, you can [create an XPI installer](#creating-an-xpi-installer) from the source code.

### Reindexing folders

After installation, you need to reindex your email folders that contain Rspamd-scored mail and enable the display of score and indicator columns for each folder. This step ensures that the add-on correctly processes and displays the spam scores for existing messages. If you installed **Rspamd-spamness** before setting up your email accounts, you can skip the rest of this section — you're all set.

To reindex a folder:

1. Select the folder you wish to reindex.
2. Right-click on the folder and choose `Properties` (or select `Edit` from the Menu Bar and then `Folder Properties`).
3. Click the `Repair Folder` button to start the reindexing process.

Repeat these steps for each folder containing Rspamd-scored mail.

### Displaying the score and indicator columns

To add score and indicator columns to your Message List:

1. Click the column picker (the small icon located in the column header area).
2. From the dropdown list, select the appropriate columns.

To apply these column settings to all folders in your account:

1. Click the column picker again.
2. Scroll down to `Apply columns to...`, select `Folder and its children...`, and then choose the top folder of your account.

## Training Rspamd

### Training via folders

You can train Rspamd by collecting emails into specific IMAP folders designed for spam or ham training. This process involves using a script that calls `rspamc` on the server side to process these emails and train Rspamd.

To facilitate this, enable toolbar buttons on the add-on settings page to quickly move or copy messages to the designated training folders. 

![Train buttons screenshot](https://github.com/user-attachments/assets/b701b5d6-da89-4aa1-a648-4f2a2ed325a6)

In the add-on settings, specify the locations of your training folders so that the toolbar buttons perform the correct actions.

### Training via HTTP API

The add-on supports direct training of Rspamd via its HTTP API. This integration allows you to interact with Rspamd directly from within the add-on interface. The add-on features a notification area in the message header for Rspamd server responses.

**Note:** Ensure that you have at least one server configured in the `neighbours` section of the Rspamd options to prevent CORS errors.

### Actions

Each training button in the add-on features a dropdown menu with actions such as `move`, `copy`, `bayes`, `fuzzy`, and `check`. You can configure these actions as default actions for the buttons in the add-on preferences. Clicking a button will execute the default action you have set.

- **Move and Copy:** Utilize the training folders you've specified.
- **Bayes, Fuzzy, and Check:** Use the Rspamd HTTP API to perform various tasks.

The `bayes` action performs the following sequentially: scans the message, trains the Bayesian classifier, and rescans the message, dynamically updating the notification with responses from the Rspamd server.

![Bayes notification screenshot](https://github.com/user-attachments/assets/3665baf5-1c04-48c3-9acf-eeae0b51d516 "Server responses are separated with arrow signs.")

## Creating an XPI installer

The `XPI` installation package is essentially a `ZIP` file with a different extension.

To create it, zip the contents of the add-on's directory (not the add-on directory itself), excluding hidden files and folders that begin with a period. Rename the ZIP file to have an `.xpi` extension (or simply drag and drop the ZIP into the `Add-ons Manager` tab).

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
