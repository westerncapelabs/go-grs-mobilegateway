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
    "test/fixtures/quiz.json",
    "test/fixtures/user_register_female.json",
    "test/fixtures/user_register_male.json",
    "test/fixtures/quiz_submit.json",
    "test/fixtures/quiz_submit_2.json",
    "test/fixtures/quiz_submit_3.json",
    "test/fixtures/quiz_submit_4.json",
    "test/fixtures/quiz_submit_5.json",
    "test/fixtures/quiz_submit_6.json",
    "test/fixtures/quiz_submit_7.json",
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
                    testing_mock_today: [2013,4,8,11,11],
                    sms_tag: ['pool', 'addr']
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
                    testing_mock_today: [2013,4,8,11,11],
                    sms_tag: ['pool', 'addr']
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

    var assert_single_sms = function(to_addr, content) {
        var teardown = function(api) {
            var sms = api.outbound_sends[0];
            assert.equal(api.outbound_sends.length, 1);
            assert.equal(sms.to_addr, to_addr);
            assert.equal(sms.content, content);
        };
        return teardown;
    };

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

    it("choosing quiz shows welcome", function (done) {
        var user = {
            current_state: 'quiz_choose',
            answers: {
                first_state: 'quiz_choose'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "quiz_4_start",
            response: (
                "^Welcome to Coach Tumi's SKILLZ Street Quiz![^]" +
                "1. Start[^]" +
                "2. Go back to Coach Tumi's quizzes!$"
            )
        });
        p.then(done, done);
    });

    it("continuing quiz shows question 1", function (done) {
        var user = {
            current_state: 'quiz_4_start',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "quiz_4_8",
            response: (
                "^Fact or Nonsense: You shake it and don't fake it in opening circle.[^]" +
                "1. Fact[^]" +
                "2. Nonsense$"
            )
        });
        p.then(done, done);
    });

    it("answering fact to question 1 shows answered correctly", function (done) {
        var user = {
            current_state: 'quiz_4_8',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start',
                quiz_4_start: 'quiz_4_8'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "quiz_4_8_22",
            response: (
                "^Correct! It's a fact! In SKILLZ Street, you will shake it and not fake " +
                "it during opening circle![^]" +
                "1. Next$"
            )
        });
        p.then(done, done);
    });

    it("answering nonsense to question 1 shows answered incorrectly", function (done) {
        var user = {
            current_state: 'quiz_4_8',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start',
                quiz_4_start: 'quiz_4_8'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "2",
            next_state: "quiz_4_8_23",
            response: (
                "^Hey sisi, it's a fact! In SKILLZ Street, you will shake it and not fake " +
                "it during opening circle![^]" +
                "1. Next$"
            )
        });
        p.then(done, done);
    });

    it("hitting next from correct answer shows question 2", function (done) {
        var user = {
            current_state: 'quiz_4_8_23',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start',
                quiz_4_start: 'quiz_4_8',
                quiz_4_8: 'quiz_4_8_23'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "quiz_4_9",
            response: (
                "^Fact or Nonsense: You will play netball in SKILLZ Street.[^]" +
                "1. Fact[^]" +
                "2. Nonsense$"
            )
        });
        p.then(done, done);
    });

    it("answering fact to question 2 shows answered incorrectly", function (done) {
        var user = {
            current_state: 'quiz_4_9',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start',
                quiz_4_start: 'quiz_4_8',
                quiz_4_8: 'quiz_4_8_22',
                quiz_4_8_22: 'true'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "quiz_4_9_24",
            response: (
                "^Aish, sisi! In SKILLZ Street, we do not play netball, we play soccer! " +
                "You will play soccer at every SKILLZ Street practice![^]" +
                "1. Next$"
            )
        });
        p.then(done, done);
    });

    it("hitting next to question 2 response shows answered question 3", function (done) {
        var user = {
            current_state: 'quiz_4_9_24',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start',
                quiz_4_start: 'quiz_4_8',
                quiz_4_8: 'quiz_4_8_22',
                quiz_4_8_22: 'true',
                quiz_4_9: 'quiz_4_9_24'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "quiz_4_10",
            response: (
                "^Fact or Nonsense: SKILLZ Street coaches are the coolest![^]" +
                "1. Fact[^]" +
                "2. Nonsense$"
            )
        });
        p.then(done, done);
    });

    it("answering fact to question 3 shows answered correctly", function (done) {
        var user = {
            current_state: 'quiz_4_10',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start',
                quiz_4_start: 'quiz_4_8',
                quiz_4_8: 'quiz_4_8_22',
                quiz_4_8_22: 'true',
                quiz_4_9: 'quiz_4_9_24',
                quiz_4_9_24: 'false'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "quiz_4_10_26",
            response: (
                "^Correct! It's a fact! Your SKILLZ Street Coaches are role models " +
                "in their communities. Talk with them to learn about how YOU can be a role " +
                "model too![^]" +
                "1. Next$"
            )
        });
        p.then(done, done);
    });

    it("hitting next to question 3 response shows question 4", function (done) {
        var user = {
            current_state: 'quiz_4_10_26',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start',
                quiz_4_start: 'quiz_4_8',
                quiz_4_8: 'quiz_4_8_22',
                quiz_4_8_22: 'true',
                quiz_4_9: 'quiz_4_9_24',
                quiz_4_9_24: 'false',
                quiz_4_10: 'quiz_4_10_26'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "quiz_4_11",
            response: (
                "Fact or Nonsense: You can dial Coach Tumi to get important information about " +
                "health services and youth centres in Soweto.[^]" +
                "1. Fact[^]" +
                "2. Nonsense$"
            )
        });
        p.then(done, done);
    });

    it("answering fact to question 4 shows answered correctly", function (done) {
        var user = {
            current_state: 'quiz_4_11',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start',
                quiz_4_start: 'quiz_4_8',
                quiz_4_8: 'quiz_4_8_22',
                quiz_4_8_22: 'true',
                quiz_4_9: 'quiz_4_9_24',
                quiz_4_9_24: 'false',
                quiz_4_10: 'quiz_4_10_26',
                quiz_4_10_26: 'true'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "quiz_4_11_28",
            response: (
                "Correct! It's a fact! Dial Coach Tumi to get important information about " +
                "health services and youth centres in Soweto.[^]" +
                "1. Next$"
            )
        });
        p.then(done, done);
    });

    it("hitting next on question 4 shows question 5", function (done) {
        var user = {
            current_state: 'quiz_4_11_28',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start',
                quiz_4_start: 'quiz_4_8',
                quiz_4_8: 'quiz_4_8_22',
                quiz_4_8_22: 'true',
                quiz_4_9: 'quiz_4_9_24',
                quiz_4_9_24: 'false',
                quiz_4_10: 'quiz_4_10_26',
                quiz_4_10_26: 'true',
                quiz_4_11: 'quiz_4_11_28'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "quiz_4_12",
            response: (
                "Fact or Nonsense: You can talk with your SKILLZ Street coach about important " +
                "things in your life.[^]" +
                "1. Fact[^]" +
                "2. Nonsense$"
            )
        });
        p.then(done, done);
    });

    it("answering nonsense to question 5 shows answered incorrectly", function (done) {
        var user = {
            current_state: 'quiz_4_12',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start',
                quiz_4_start: 'quiz_4_8',
                quiz_4_8: 'quiz_4_8_22',
                quiz_4_8_22: 'true',
                quiz_4_9: 'quiz_4_9_24',
                quiz_4_9_24: 'false',
                quiz_4_10: 'quiz_4_10_26',
                quiz_4_10_26: 'true',
                quiz_4_11: 'quiz_4_11_28',
                quiz_4_11_28: 'true'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "2",
            next_state: "quiz_4_12_31",
            response: (
                "Remember, you can always talk to your SKILLZ Street Coach about important " +
                "things in your life.[^]" +
                "1. Next$"
            )
        });
        p.then(done, done);
    });

    it("hitting next to question 5 response shows 3 out of 5 result", function (done) {
        var user = {
            current_state: 'quiz_4_12_31',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start',
                quiz_4_start: 'quiz_4_8',
                quiz_4_8: 'quiz_4_8_22',
                quiz_4_8_22: 'true',
                quiz_4_9: 'quiz_4_9_24',
                quiz_4_9_24: 'false',
                quiz_4_10: 'quiz_4_10_26',
                quiz_4_10_26: 'true',
                quiz_4_11: 'quiz_4_11_28',
                quiz_4_11_28: 'true',
                quiz_4_12: 'quiz_4_12_31'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "quiz_4_end",
            response: (
                "You got 3\\/5. You can bounce back! Take the quiz again to improve " +
                "your score.[^]" +
                "1. Go back to Coach Tumi's quizzes$"),
            teardown: assert_single_sms("1234567", "Hey sisi! SKILLZ Street is a programme for girls. " +
            "You will play soccer, dance, sing, laugh, make friends, and discuss things that " +
            "are important to YOU!")
        });
        p.then(done, done);
    });

    it("choosing to go back to quizzes shows list", function (done) {
        var user = {
            current_state: 'quiz_4_end',
            answers: {
                first_state: 'quiz_choose',
                quiz_choose: 'quiz_4_start',
                quiz_4_start: 'quiz_4_8',
                quiz_4_8: 'quiz_4_8_22',
                quiz_4_8_22: 'true',
                quiz_4_9: 'quiz_4_9_24',
                quiz_4_9_24: 'false',
                quiz_4_10: 'quiz_4_10_26',
                quiz_4_10_26: 'true',
                quiz_4_11: 'quiz_4_11_28',
                quiz_4_11_28: 'true',
                quiz_4_12: 'quiz_4_12_31',
                quiz_4_12_31: 'false'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
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
                    testing_mock_today: [2013,4,8,11,11],
                    sms_tag: ['pool', 'addr']
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

    it.skip("choosing quizzes should show none available", function (done) {
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
