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
var BookletState = vumigo.states.BookletState;
var InteractionMachine = vumigo.state_machine.InteractionMachine;
var StateCreator = vumigo.state_machine.StateCreator;

function GoGRSMobilegatewayError(msg) {
    var self = this;
    self.msg = msg;

    self.toString = function() {
        return "<GoGRSMobilegatewayError: " + self.msg + ">";
    };
}

function GoGRSMobilegateway() {
    var self = this;
    // The first state to enter
    StateCreator.call(self, 'first_state');

    self.post_headers = {
        'Content-Type': ['application/json']
    };

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

    self.url_encode = function(params) {
        var items = [];
        for (var key in params) {
            items[items.length] = (encodeURIComponent(key) + '=' +
                                   encodeURIComponent(params[key]));
        }
        return items.join('&');
    };

    self.send_sms = function(content, to_addr) {
        var sms_tag = im.config.sms_tag;
        if (!sms_tag) return success(true);
        im.log('outbound.send_to_tag with ' + content + ' and ' + to_addr);
        return im.api_request("outbound.send_to_tag", {
            to_addr: to_addr,
            content: content,
            tagpool: sms_tag[0],
            tag: sms_tag[1]
        });
    };

    self.cms_get = function(path) {
        var url = im.config.cms_api_root + path;
        var p = im.api_request("http.get", {
            url: url,
            headers: self.headers
        });
        p.add_callback(function(result) {
            var json = self.check_reply(result, url, 'GET', null, false);
            return json;
        });
        return p;
    };

    self.cms_post = function(path, data) {
        var url = im.config.cms_api_root + path;
        var p = im.api_request("http.post", {
            url: url,
            headers: self.post_headers,
            data: JSON.stringify(data)
        });
        p.add_callback(function(result) {
            var json = self.check_reply(result, url, 'POST', data, false);
            return json;
        });
        return p;
    };

    self.check_reply = function(reply, url, method, data, ignore_error) {
        var error;
        if (reply.success && (reply.code >= 200 && reply.code < 300))  {
            if (reply.body) {
                var json = JSON.parse(reply.body);
                return json;
            } else {
                return null;
            }
        }
        else {
            error = reply.reason;
        }
        var error_msg = ("API " + method + " to " + url + " failed: " +
                         error);
        if (typeof data != 'undefined') {
            error_msg = error_msg + '; data: ' + JSON.stringify(data);
        }

        im.log(error_msg);
        if (!ignore_error) {
            throw new GoGRSMobilegatewayError(error_msg);
        }
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

    self.state_exists = function(state_name) {
        return self.state_creators.hasOwnProperty(state_name);
    };

    self.add_creator_unless_exists = function(state_name, state) {
        if(self.state_exists(state_name)) {
            return;
        }

        return self.add_creator(state_name, state);
    };

    self.sort_by_dimension = function(dimension){
        return function(a,b){
            return a[dimension] - b[dimension];
        };
    };

    self.registration_data_collect = function(){
        var data = {
            "msisdn": parseInt(im.user_addr),
            "sex": im.get_user_answer('reg_sex'),
            "age": im.get_user_answer('reg_age'),
            "grade": im.get_user_answer('reg_grade'),
            "community": im.get_user_answer('reg_community')
        };

        return data;
    };

    // END Shared helpers

    // START CMS Interactions

    self.cms_quizzes_load = function() {
        var p = self.cms_get("quiz/");
        return p;
    };


    self.cms_register_user = function(im) {
        var registration_data = self.registration_data_collect();
        return self.cms_post("users/", registration_data);
    };

    self.cms_log_quiz_response = function(quiz_id, question_id, question, correct) {
        var quiz_data = {
            "created_by": "/api/v1/users/msisdn/" + parseInt(im.user_addr) + "/",
            "quiz": "/api/v1/quiz/" + quiz_id + "/",
            "question": "/api/v1/question/" + question_id + "/",
            "question_text": question,
            "correct": correct
        };
        return self.cms_post("quizresponses/", quiz_data);
    };

    // END CMS Interactions

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
                new Choice("opt_in_sms_services", "Get contact info about local health services or " +
                    "youth centres"),
                new Choice("quiz_choose", "Take a Coach Tumi quiz to test your knowledge about SKILLZ " +
                    "Street")
            ]
        );
    };

    self.make_no_quizzes_state = function(){
        return function(){
            return new ChoiceState(
                "quiz_choose", "first_state",
                "Sorry Sisi! No quizzes this week. Come back again soon!",
                [new Choice("first_state", "Main menu")]
            );
        };
    };

    self.make_quizzes_state = function(choices){
        return function(){
            return new ChoiceState(
                "quiz_choose",
                function(choice) {
                    return choice.value;
                },
                "Welcome sisi! Take one of Coach Tumi's quizzes!",
                choices
            );
        };
    };

    self.make_quiz_start_state = function(state_name, next_state, welcome){
        return function(){
            return new ChoiceState(
                state_name,
                next_state,
                welcome,
                [
                    new Choice("active", "Start"),
                    new Choice("quiz_choose", "Go back to Coach Tumi's quizzes!")
                ]
            );
        };
    };


    self.make_quiz_question_state = function(state_name, question, choices){
        return function(){
            return new ChoiceState(
                state_name,
                function(choice) {
                    return choice.value;
                },
                question,
                choices
            );
        };
    };

    self.make_quiz_response_state = function(state_name, next_state, response,
            correct, quiz_id, question_id, question){
        return function(){
            return new ChoiceState(
                state_name,
                next_state,
                response,
                [
                    new Choice(correct, "Next")
                ], null,
                {
                    on_enter: function(){
                        return self.cms_log_quiz_response(quiz_id, question_id, question, correct);
                    }
                }
            );
        };
    };

    self.make_quiz_end_state = function(quiz_prefix, answer_states, results){
        return function(){
            var total = 0;
            for (var i=0; i<answer_states.length;i++){
                // find out their score needs increasing
                if (JSON.parse(im.get_user_answer(answer_states[i]))) total++;
            }
            return new ChoiceState(
                quiz_prefix + "_end",
                "first_state",
                results[total].text,
                [
                    new Choice("first_state", "Go back to main menu")
                ],null,
                {
                    on_enter: function(){
                        if (im.get_user_answer(quiz_prefix + '_opt_in_sms_quiz') == "yes") {
                            return self.send_sms(results[total].sms, im.user_addr);
                        }
                    }
                }
            );
        };
    };
    
    self.build_quiz_states = function(im) {
        var p_quizzes = self.cms_get('quiz/');
        p_quizzes.add_callback(function(result) {
            if (result.objects.length === 0){
                // Just build no quizzes state
                self.add_creator_unless_exists(
                    "quiz_choose",
                    self.make_no_quizzes_state()
                );
            } else {
                // Build quizzes list
                var choices = [];
                var quiz;
                for (var i = 0; i < result.objects.length; i++){
                    quiz = result.objects[i];
                    choices.push(new Choice("quiz_" + quiz.id + "_start", quiz.name));
                }
                self.add_creator_unless_exists(
                    "quiz_choose",
                    self.make_quizzes_state(choices)
                );
                // Build quiz states
                var quiz_prefix, questions, question, answers, answer, state_name, a_choices;
                var next_state, response_state_name, response_state_names, results;
                for (var j = 0; j < result.objects.length; j++){
                    quiz = result.objects[j];
                    quiz_prefix = "quiz_" + quiz.id;
                    response_state_names = [];
                    questions = quiz.questions.sort(self.sort_by_dimension("id"));
                    for (var q = 0; q < questions.length; q++){
                        question = questions[q];
                        answers = question.answers.sort(self.sort_by_dimension("id"));
                        state_name = quiz_prefix + "_" + question.id;
                        if (q === 0){ // First question so link welcome to it
                            self.add_creator_unless_exists(
                                quiz_prefix + "_start",
                                self.make_quiz_start_state(quiz_prefix + "_start", state_name, quiz.description)
                            );
                        }
                        a_choices = [];
                        for (var a = 0; a < answers.length; a++){
                            answer = answers[a];
                            a_choices.push(new Choice(state_name + "_" + answer.id, answer.answer));
                            // Generate response state
                            next_state = (q == questions.length-1) ? quiz_prefix + "_opt_in_sms_quiz" : quiz_prefix + "_" + questions[q+1].id;
                            response_state_name = state_name + "_" + answer.id;
                            response_state_names.push(response_state_name); // to extract answers to total
                            self.add_creator_unless_exists(
                                response_state_name,
                                self.make_quiz_response_state(response_state_name,
                                    next_state, answer.response, answer.correct, quiz.id,
                                    question.id, question.question)
                            );
                        }
                        self.add_creator_unless_exists(
                            state_name,
                            self.make_quiz_question_state(state_name, question.question, a_choices)
                        );
                    }

                    // Make opt-in state
                    self.add_creator_unless_exists(
                        quiz_prefix + "_opt_in_sms_quiz",
                        self.make_opt_in_state_function(quiz_prefix + "_opt_in_sms_quiz", quiz_prefix + "_end",
                        "your results and top tips"));

                    // Make end state generator
                    results = quiz.final_responses.sort(self.sort_by_dimension("for_total"));
                    self.add_creator_unless_exists(
                        quiz_prefix + "_end",
                        self.make_quiz_end_state(quiz_prefix, response_state_names, results)
                    );
                }
            }
        });
        return p_quizzes;
    };


    self.make_opt_in_state_function = function(state_name, next_state, sms_content){
        return function(){
            return new ChoiceState(
                state_name, next_state,
                "Do you want to receive a free SMS with " + sms_content + "?",
                [
                    new Choice("yes", "Yes, send SMS too"),
                    new Choice("no", "No, just on-screen"),
                ]
            );
        };
    };

    self.make_opt_in_state = function(state_name, next_state, sms_content){
        return new ChoiceState(
            state_name, next_state,
            "Do you want to receive a free SMS with " + sms_content + "?",
            [
                new Choice("yes", "Yes, send SMS too"),
                new Choice("no", "No, just on-screen"),
            ]
        );
    };

    self.make_services_state = function(choices){
        return function(){
            return new ChoiceState(
                "services",
                function(choice) {
                    return choice.value;
                },
                "Choose a service:",
                choices
            );
        };
    };

    self.make_category_state = function(state_name, choices){
        return function(){
            return new ChoiceState(
                state_name,
                function(choice) {
                    return choice.value;
                },
                "Choose one:",
                choices
            );
        };
    };

    self.build_services_states = function(im) {
        var p_services = self.cms_get('category/');
        p_services.add_callback(function(result) {
            if (result.objects.length === 0){
                // Just build no services state
                self.add_creator_unless_exists(
                    "quiz_choose",
                    self.make_no_quizzes_state()
                );
            } else {
                // Build services list
                var choices = [];
                var categories;
                for (var i = 0; i < result.objects.length; i++){
                    categories = result.objects[i];
                    category_prefix = "category_" + categories.id;
                    choices.push(new Choice(category_prefix + "_start", categories.name));
                    var choices_category = [];
                    var category;
                    for (var c = 0; c < categories.category.length; c++){
                        category = categories.category[c];
                        category_state_name = category_prefix + "_" + category.id;
                        choices_category.push(new Choice(category_state_name, category.name));
                        self.add_creator_unless_exists(
                            category_state_name,
                            self.make_booklet_state("services", [
                                category.content_1,
                                category.content_2,
                                category.content_3
                            ], category.sms));
                    }
                    choices_category.push(new Choice("services", "Back"));
                    self.add_creator_unless_exists(
                        category_prefix + "_start",
                        self.make_category_state(category_prefix + "_start", choices_category)
                    );
                }
                choices.push(new Choice("first_state", "Back to main menu"));
                self.add_creator_unless_exists(
                    "services",
                    self.make_services_state(choices)
                );
            }
        });
        return p_services;
    };

    self.make_booklet_state = function(end_state, content_array, sms) {
        return function(state_name, im) {
            var next_page = function(page_number) {
                return content_array[page_number];
            };
            return new BookletState(
                state_name, {
                    next: end_state,
                    pages: (content_array.length),
                    page_text: next_page,
                    buttons: {
                        "1": -1, "2": +1, "0": "exit"
                    },
                    footer_text: "\n1 for prev, 2 for next, 0 to end.",
                    handlers:
                    {
                        on_enter: function(){
                            if (im.get_user_answer('opt_in_sms_services') == "yes") {
                                return self.send_sms(sms, im.user_addr);
                            }
                        }
                    }
                }
            );
        };
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
            new Choice("opt_in_sms_services", "Get contact info about local health services or " +
                "youth centres"),
            new Choice("quiz_choose", "Take a Coach Tumi quiz to test your knowledge about SKILLZ " +
                "Street")
        ],null,
        {
            on_enter: function(){
                var p = self.cms_register_user();
                p.add_callback(function(result){
                    var p_contact = self.get_contact(im);
                    p_contact.add_callback(function(result){
                        var fields = {
                            "grs_registered": "true",
                            "grs_registered_at": JSON.stringify(self.get_today(im))
                        };
                        return im.api_request('contacts.update_extras', {
                            key: result.contact.key,
                            fields: fields
                        });
                    });
                    return p_contact;
                });
                return p;
            }
        }
    ));

    
    self.add_state(self.make_opt_in_state("opt_in_sms_services", "services",
        "a copy of the services info for the categories you look at"));


    self.on_config_read = function(event){
        // Run calls out to the APIs to load dynamic states
        var p = new Promise();
        p.add_callback(self.build_quiz_states);
        p.add_callback(self.build_services_states);
        p.callback();
        return p;
    };
}

// launch app
var states = new GoGRSMobilegateway();
var im = new InteractionMachine(api, states);
im.attach();