REPORTER = list
MOCHA_OPTS = --ui tdd 
 
test:
	clear
	@NODE_ENV=development
	echo Starting test *********************************************************
	./node_modules/mocha/bin/mocha \
	--reporter $(REPORTER) \
	$(MOCHA_OPTS) \
	test/*.js
	echo Ending test

.PHONY: test 