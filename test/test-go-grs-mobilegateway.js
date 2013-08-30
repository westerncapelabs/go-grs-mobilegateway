var fs = require("fs");
var assert = require("assert");
var vumigo = require("vumigo_v01");
// CHANGE THIS to your-app-name
var app = require("../lib/go-grs-mobilegateway");

// This just checks that you hooked you InteractionMachine
// up to the api correctly and called im.attach();
describe("test_api", function() {
    it("should exist", function() {
        assert.ok(app.api);
    });
    it("should have an on_inbound_message method", function() {
        assert.ok(app.api.on_inbound_message);
    });
    it("should have an on_inbound_event method", function() {
        assert.ok(app.api.on_inbound_event);
    });
});

// These are used to mock API reponses
// EXAMPLE: Response from google maps API
var test_fixtures_full = [
];

var tester;

describe("When using the USSD line as an un registered user", function() {

    var fixtures = test_fixtures_full;
    beforeEach(function() {
        tester = new vumigo.test_utils.ImTester(app.api, {
            custom_setup: function (api) {
                api.config_store.config = JSON.stringify({
                    cms_api_root: 'http://qa/api/v1/'
                });

                var dummy_contact = {
                    key: "f953710a2472447591bd59e906dc2c26",
                    surname: "Trotter",
                    user_account: "test-0-user",
                    bbm_pin: null,
                    msisdn: "+1234567",
                    created_at: "2013-04-24 14:01:41.803693",
                    gtalk_id: null,
                    dob: null,
                    groups: null,
                    facebook_id: null,
                    twitter_handle: null,
                    email_address: null,
                    name: "Rodney"
                };

                api.add_contact(dummy_contact);

                fixtures.forEach(function (f) {
                    api.load_http_fixture(f);
                });
            },
            async: true
        });
    });

    // first test should always start 'null, null' because we haven't
    // started interacting yet
    it("should be asked to answer registration questions", function (done) {
        var p = tester.check_state({
            user: null,
            content: null,
            next_state: "first_state",
            response: "^Welcome Sisi! Is it OK if Coach Tumi from SKILLZ Street " +
                "asks you a few questions\\?[^]" +
                "1. Yes[^]" +
                "2. No$"
        });
        p.then(done, done);
    });

    it("answering no to registration should ask exit", function (done) {
        var user = {
            current_state: 'first_state'
        };
        var p = tester.check_state({
            user: user,
            content: "2",
            next_state: "reg_end_error",
            response: (
                "^Thank you for stopping by! Feel free to call Coach Tumi any " +
                    "time. Kilo for strong and beautiful girls! Love, Coach Tumi$"
            ),
            continue_session: false
        });
        p.then(done, done);
    });

    it("answering yes to registration should ask sex", function (done) {
        var user = {
            current_state: 'first_state'
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "reg_sex",
            response: (
                "^What is your sex\\?[^]" +
                "1. Female[^]" +
                "2. Male$"
            )
        });
        p.then(done, done);
    });

    it.skip("declining to know what we said, should say goodbye", function (done) {
        var user = {
            current_state: 'second_state',
            answers: {
                first_state: 'Hello world!'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "2",
            next_state: "end_state",
            response: "^Thank you and bye bye!$",
            continue_session: false
        });
        p.then(done, done);
    });

});