Spamness
========

This is a Thunderbird add-on for visualizing SpamAssassin scores generated
on the server-side and embedded in message headers.  It does NOT actively
run SpamAssassin in any meaningful way, nor will it.

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

This is under active development to improve its usability in different
environments and its visuals.

[1]: https://addons.mozilla.org/thunderbird/addon/confirmfoldermove/
[2]: http://www.babelzilla.org/
