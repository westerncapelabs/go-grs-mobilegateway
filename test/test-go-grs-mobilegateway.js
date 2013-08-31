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
    "test/fixtures/quiz.json"
];

var tester;

describe("When using the USSD line as an un registered user", function() {

    var fixtures = test_fixtures_full;
    beforeEach(function() {
        tester = new vumigo.test_utils.ImTester(app.api, {
            custom_setup: function (api) {
                api.config_store.config = JSON.stringify({
                    cms_api_root: 'http://qa/api/v1/',
                    testing: true,
                    testing_mock_today: [2013,4,8,11,11]
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

    it("answering female to sex should ask age", function (done) {
        var user = {
            current_state: 'reg_sex',
            answers: {
                first_state: 'reg_sex'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "reg_age",
            response: "^What is your age\\?[^]" +
                "1. 11 or younger[^]" +
                "2. 12[^]" +
                "3. 13[^]" +
                "4. 14[^]" +
                "5. 15[^]" +
                "6. 16 or older$",
        });
        p.then(done, done);
    });

    it("answering male to sex should skip age and go to ask grade", function (done) {
        var user = {
            current_state: 'reg_sex',
            answers: {
                first_state: 'reg_sex'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "2",
            next_state: "reg_grade",
            response: "^What is your grade\\?[^]" +
                "1. Grade 5[^]" +
                "2. Grade 6[^]" +
                "3. Grade 7[^]" +
                "4. Grade 8[^]" +
                "5. Grade 9[^]" +
                "6. Grade 10\\+$",
        });
        p.then(done, done);
    });

    it("as female answering age should ask grade", function (done) {
        var user = {
            current_state: 'reg_age',
            answers: {
                first_state: 'reg_sex',
                reg_sex: 'female'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "2",
            next_state: "reg_grade",
            response: "^What is your grade\\?[^]" +
                "1. Grade 5[^]" +
                "2. Grade 6[^]" +
                "3. Grade 7[^]" +
                "4. Grade 8[^]" +
                "5. Grade 9[^]" +
                "6. Grade 10\\+$",
        });
        p.then(done, done);
    });

    it("answering grade should ask community", function (done) {
        var user = {
            current_state: 'reg_grade',
            answers: {
                first_state: 'reg_sex',
                reg_sex: 'female',
                reg_age: '12'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "3",
            next_state: "reg_community",
            response: "^Where do you stay\\?[^]" +
                "1. Meadowlands[^]" +
                "2. Dobsonville[^]" +
                "3. Snake Park[^]" +
                "4. Bramfischer[^]" +
                "5. Tshepisong[^]" +
                "6. Other$",
        });
        p.then(done, done);
    });

    it("female answering community should save and show main menu", function (done) {
        var user = {
            current_state: 'reg_community',
            answers: {
                first_state: 'reg_sex',
                reg_sex: 'female',
                reg_age: '12',
                reg_grade: '6'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "3",
            next_state: "reg_save_and_menu",
            response: "^How can Coach Tumi help you\\?[^]" +
                "1. Get contact info about local health services or " +
                "youth centres[^]" +
                "2. Take a Coach Tumi quiz to test your knowledge about SKILLZ " +
                "Street$",
        });
        p.then(function() {
            var updated_contact = app.api.contact_store['f953710a2472447591bd59e906dc2c26'];
            assert.equal(updated_contact['extras-grs_registered'], 'true');
        }).then(done, done);
    });

    it("male answering community should save and show main menu", function (done) {
        var user = {
            current_state: 'reg_community',
            answers: {
                first_state: 'reg_sex',
                reg_sex: 'male',
                reg_grade: '6'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "3",
            next_state: "reg_save_and_menu",
            response: "^How can Coach Tumi help you\\?[^]" +
                "1. Get contact info about local health services or " +
                "youth centres[^]" +
                "2. Take a Coach Tumi quiz to test your knowledge about SKILLZ " +
                "Street$",
        });
        p.then(function() {
            var updated_contact = app.api.contact_store['f953710a2472447591bd59e906dc2c26'];
            assert.equal(updated_contact['extras-grs_registered'], 'true');
        }).then(done, done);
    });
});

describe("When using the USSD line as an registered user", function() {

    var fixtures = test_fixtures_full;
    beforeEach(function() {
        tester = new vumigo.test_utils.ImTester(app.api, {
            custom_setup: function (api) {
                api.config_store.config = JSON.stringify({
                    cms_api_root: 'http://qa/api/v1/',
                    testing: true,
                    testing_mock_today: [2013,4,8,11,11]
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
                api.update_contact_extras(dummy_contact, {
                    "grs_registered": "true",
                    "grs_registered_at": "2013-05-08T09:11:00.000Z"
                });

                fixtures.forEach(function (f) {
                    api.load_http_fixture(f);
                });
            },
            async: true
        });
    });

    // first test should always start 'null, null' because we haven't
    // started interacting yet
    it("should be shown main menu", function (done) {
        var p = tester.check_state({
            user: null,
            content: null,
            next_state: "first_state",
            response: "^How can Coach Tumi help you\\?[^]" +
                "1. Get contact info about local health services or " +
                "youth centres[^]" +
                "2. Take a Coach Tumi quiz to test your knowledge about SKILLZ " +
                "Street$"
        });
        p.then(done, done);
    });

    it("choosing quizzes should show list", function (done) {
        var user = {
            current_state: 'first_state'
        };
        var p = tester.check_state({
            user: user,
            content: "2",
            next_state: "quiz_choose",
            response: (
                "^Welcome sisi! Take one of Coach Tumi's quizzes![^]" +
                "1. SKILLZ Street Quiz!$"
            )
        });
        p.then(done, done);
    });
});

describe("When using the USSD line as an registered user with no quizzes", function() {

    var fixtures = [
        'test/fixtures/quiz_none.json'
    ];
    beforeEach(function() {
        tester = new vumigo.test_utils.ImTester(app.api, {
            custom_setup: function (api) {
                api.config_store.config = JSON.stringify({
                    cms_api_root: 'http://qa/api/v1/',
                    testing: true,
                    testing_mock_today: [2013,4,8,11,11]
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
                api.update_contact_extras(dummy_contact, {
                    "grs_registered": "true",
                    "grs_registered_at": "2013-05-08T09:11:00.000Z"
                });

                fixtures.forEach(function (f) {
                    api.load_http_fixture(f);
                });
            },
            async: true
        });
    });

    it("choosing quizzes should show none available", function (done) {
        var user = {
            current_state: 'first_state'
        };
        var p = tester.check_state({
            user: user,
            content: "2",
            next_state: "quiz_choose",
            response: (
                "^Sorry Sisi! No quizzes this week. Come back again soon![^]" +
                "1. Main menu$"
            )
        });
        p.then(done, done);
    });
});
