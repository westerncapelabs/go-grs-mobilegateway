var vumigo = require("vumigo_v01");
var jed = require("jed");

if (typeof api === "undefined") {
    // testing hook (supplies api when it is not passed in by the real sandbox)
    var api = this.api = new vumigo.dummy_api.DummyApi();
}

var Promise = vumigo.promise.Promise;
var success = vumigo.promise.success;
var Choice = vumigo.states.Choice;
var ChoiceState = vumigo.states.ChoiceState;
var FreeText = vumigo.states.FreeText;
var EndState = vumigo.states.EndState;
var InteractionMachine = vumigo.state_machine.InteractionMachine;
var StateCreator = vumigo.state_machine.StateCreator;

function GoGRSMobilegateway() {
    var self = this;
    // The first state to enter
    StateCreator.call(self, 'first_state');

    // START Shared helpers

    self.log_result = function() {
        return function (result) {
            var p;
            if (im.config.testing) {
                p = console.log('Got result ' + JSON.stringify(result));
            } else {
                p = im.log('Got result ' + JSON.stringify(result));
            }
            p.add_callback(function() { return result; });
            return p;
        };
    };

    self.get_contact = function(im){
        var p = im.api_request('contacts.get_or_create', {
            delivery_class: 'ussd',
            addr: im.user_addr
        });
        return p;
    };

    self.get_today = function(im) {
        var today = null;
        if (im.config.testing) {
            return new Date(im.config.testing_mock_today[0],
                             im.config.testing_mock_today[1],
                             im.config.testing_mock_today[2],
                             im.config.testing_mock_today[3],
                             im.config.testing_mock_today[4]);
        } else {
            return new Date();
        }
    };

    // END Shared helpers


    // START Shared creators

    self.error_state = function() {
        return new EndState(
            "end_state_error",
            "Sorry! Something went wrong. Please redial and try again.",
            "first_state"
        );
    };

    self.make_main_menu = function(state_name) {
        return new ChoiceState(
            state_name,
            function(choice) {
                return choice.value;
            },
            "How can Coach Tumi help you?",
            [
                new Choice("services", "Get contact info about local health services or " +
                    "youth centres"),
                new Choice("quiz_choose", "Take a Coach Tumi quiz to test your knowledge about SKILLZ " +
                    "Street")
            ]
        );
    };

    // END Shared creators


    self.add_creator('first_state', function(state_name, im) {
        var p = self.get_contact(im);
        p.add_callback(function(result){
            if (result.contact["extras-grs_registered"] === undefined){
                // unrecognised user
                return new ChoiceState(
                    state_name,
                    function(choice) {
                        return choice.value;
                    },
                    "Welcome Sisi! Is it OK if Coach Tumi from SKILLZ Street asks " +
                        "you a few questions?",
                    [
                        new Choice("reg_sex", "Yes"),
                        new Choice("reg_end_error", "No")
                    ]
                );
            } else {
                // recognised user
                return self.make_main_menu(state_name);
            }
        });
        return p;
    });

    self.add_state(new ChoiceState(
        "reg_sex",
        function(choice) {
            return (choice.value == 'male' ? 'reg_grade' : 'reg_age');
        },
        "What is your sex?",
        [
            new Choice("female", "Female"),
            new Choice("male", "Male")
        ]
    ));

    self.add_state(new ChoiceState(
        "reg_age",
        "reg_grade",
        "What is your age?",
        [
            new Choice("11 or younger", "11 or younger"),
            new Choice("12", "12"),
            new Choice("13", "13"),
            new Choice("14", "14"),
            new Choice("15", "15"),
            new Choice("16 or older", "16 or older")
        ]
    ));

    self.add_state(new ChoiceState(
        "reg_grade",
        "reg_community",
        "What is your grade?",
        [
            new Choice("5", "Grade 5"),
            new Choice("6", "Grade 6"),
            new Choice("7", "Grade 7"),
            new Choice("8", "Grade 8"),
            new Choice("9", "Grade 9"),
            new Choice("10+", "Grade 10+")
        ]
    ));

    self.add_state(new ChoiceState(
        "reg_community",
        "reg_save_and_menu",
        "Where do you stay?",
        [
            new Choice("Meadowlands", "Meadowlands"),
            new Choice("Dobsonville", "Dobsonville"),
            new Choice("Snake Park", "Snake Park"),
            new Choice("Bramfischer", "Bramfischer"),
            new Choice("Tshepisong", "Tshepisong"),
            new Choice("Other", "Other")
        ]
    ));

    self.add_state(new EndState(
        "reg_end_error",
        "Thank you for stopping by! Feel free to call Coach Tumi any time. Kilo for " +
            "strong and beautiful girls! Love, Coach Tumi",
        "first_state"
    ));

    self.add_state(new ChoiceState(
        "reg_save_and_menu",
        function(choice) {
            return choice.value;
        },
        "How can Coach Tumi help you?",
        [
            new Choice("services", "Get contact info about local health services or " +
                "youth centres"),
            new Choice("quiz_choose", "Take a Coach Tumi quiz to test your knowledge about SKILLZ " +
                "Street")
        ],null,
        {
            on_enter: function(){
                var p = self.get_contact(im);
                p.add_callback(function(result){
                    var fields = {
                        "grs_registered": "true",
                        "grs_registered_at": JSON.stringify(self.get_today(im))
                    };
                    return im.api_request('contacts.update_extras', {
                        key: result.contact.key,
                        fields: fields
                    });
                });
                return p;
            }
        }
    ));

}

// launch app
var states = new GoGRSMobilegateway();
var im = new InteractionMachine(api, states);
im.attach();