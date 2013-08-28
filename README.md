# Mobile Gateway for Grassroot Soccer

*Author:* Mike Jones [mike@westerncapelabs.com]

Minimum viable vumi-go JavaScript skeleton

## Application layout

    lib/
    lib/go-grs-mobilegateway.js
    test/test.js
    test/test-go-grs-mobilegateway.js
    test/fixtures/
    package.json

Everywhere you see `vumi-go-skeleton` you should replace this with `your-app-name`.

## Test it!

    $ npm install mocha vumigo_v01 jed
    $ npm test

of if you want to have a constant test check running run the following (WARNING: config changes require this watcher restarted)

    $ ./node_modules/.bin/mocha -R spec --watch
