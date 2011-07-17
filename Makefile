all: spamness.xpi

spamness.xpi:
	make -f Makefile.chrome -C chrome spamness.jar
	rm -f $@
	zip $@ chrome/spamness.jar defaults/preferences/spamness.js install.rdf license.txt chrome.manifest

babelzilla:
	make -f Makefile.chrome -C chrome babelzilla
	rm -rf spamness.xpi
	zip spamness.xpi chrome/spamness.jar install.rdf license.txt chrome.manifest defaults/preferences/spamness.js 

localize:
	rm -rf chrome/locale/*
	wget http://www.babelzilla.org/wts/download/locale/all/skipped/5242 -O chrome/locale/locales.tar.gz
	cd chrome/locale/; tar xzf locales.tar.gz
	rm -rf chrome/locale/locales.tar.gz

clean:
	rm -f chrome/spamness.jar spamness.xpi
