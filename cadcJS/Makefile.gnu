#/*+
#************************************************************************
#****  C A N A D I A N   A S T R O N O M Y   D A T A   C E N T R E  *****
#*
#*   File Name:	Makefile
#*
#*   Purpose:
#*	To make a 'dist' version of the JavaScript
#*
#*   Date		: May 29, 2015
#*
#*   Programmer		: Dustin Jenkins
#*
#****  C A N A D I A N   A S T R O N O M Y   D A T A   C E N T R E  *****
#************************************************************************
#-*/

OS_FAMILY = $(shell uname)

ifeq ($(OS_FAMILY),Darwin)
  PHANTOMJS_DIR = Mac\ OS\ X
else
  PHANTOMJS_DIR = ${OS_FAMILY}
endif

RSYNC = /usr/bin/rsync
RSYNC_FLAGS = -avc
SRC = ./src
DEST = ./build
TEST_CMD = test/phantomjs/${PHANTOMJS_DIR}/phantomjs
TEST_ARGS = test/qunit-runner.js --qunit test/qunit-1.10.0.js
TEST_URI_PKG_ARGS = $(TEST_ARGS) --package test/src/www/javascript/uri/package.json --tests test/src/www/javascript/uri/test.uri.js --junit test/src/www/javascript/uri/qunit-results.xml test/src/www/javascript/uri/test.uri.js
TEST_URI_CMD = $(TEST_CMD) $(TEST_URI_PKG_ARGS)
TEST_UTIL_PKG_ARGS = $(TEST_ARGS) --package test/src/www/javascript/util/package.json --tests test/src/www/javascript/util/test.util.js --junit test/src/www/javascript/util/qunit-results.xml test/src/www/javascript/util/test.util.js
TEST_UTIL_CMD = $(TEST_CMD) $(TEST_UTIL_PKG_ARGS)

.PHONY: test

install:
	${RSYNC} $(RSYNC_FLAGS) $(DEST)/www $(RPS)

test:
	$(TEST_URI_CMD) && $(TEST_UTIL_CMD)

release: all

rsync: 
	${RSYNC} ${RSYNC_FLAGS} ${SRC}/www $(DEST);
	setModificationDate.sh ${DEST}/www;

clean:
	rm -rf ${DEST}/www

all: clean rsync test install
