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


    self.add_creator('first_state', function(state_name, im) {
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

    self.add_state(new EndState(
        "reg_end_error",
        "Thank you for stopping by! Feel free to call Coach Tumi any time. Kilo for " +
            "strong and beautiful girls! Love, Coach Tumi",
        "first_state"
    ));
}

// launch app
var states = new GoGRSMobilegateway();
var im = new InteractionMachine(api, states);
im.attach();