ConfirmFolderMove
=================

This is a Thunderbird add-on for confirming folder movement to avoid the
pain of accidentally shifting an enormous IMAP folder out of place and
the consequences of waiting for it to complete before correcting the
mistake.

You should acquire it from [addons.mozilla.org][1].  Thanks to the hard
work and commitment of folks at [BabelZilla][2], the add-on is available
in a wide variety of localizations.

Development
-----------

This is a Make based project.  There are two main targets, one builds the
XPI appropriate for deployment (`all`), the other builds an XPI for
translation for upload to BabelZilla (`babelzilla`), which includes strings
that are used in the `install.rdf` and addons.mozilla.org and consequently
sit outside the normal flow of translation.

I consider this add-on feature complete.

Mechanism
---------

Inspection of the source should reveal that this patches one method usually
found in `chrome://messenger/content/folderPane.js`, `gFolderTreeView.drop`.

If anybody can help me get this committed to the actual Thunderbird code
base so the add-on is no longer necessary, please let me know.

[1]: https://addons.mozilla.org/thunderbird/addon/confirmfoldermove/
[2]: http://www.babelzilla.org/
