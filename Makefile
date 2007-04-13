all: spamness.xpi

spamness.xpi:
	make -f Makefile.chrome -C chrome spamness.jar
	rm -f $@
	zip $@ chrome/spamness.jar defaults/preferences/spamness.js install.rdf license.txt chrome.manifest

clean:
	rm -f chrome/spamness.jar spamness.xpi
