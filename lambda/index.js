'use strict';

var Alexa = require('alexa-sdk');
var config = require('./config');
var logError = require('./lib/log-error');

var contentful = require('./lib/contentful-client')(config);

var GAME_STATES = {
  TRIVIA: "_TRIVIAMODE", // Asking trivia questions.
  START: "_STARTMODE", // Entry point, start the game.
  HELP: "_HELPMODE" // The user is asking for help.
};

var helpStateHandlers = require('./lib/help-state-handlers')(config, GAME_STATES);
var otherTriviaSteHandlers = require('./lib/other-trvia-state-handlers')(config, GAME_STATES);
var newSessionHandlers = require('./lib/other-new-session-state-handlers')(config, GAME_STATES);
var helper = require('./lib/helpers')(config);

exports.handler = function(event, context, callback){
  var alexa = Alexa.handler(event, context);
  alexa.appId = config.appId;
  alexa.registerHandlers(newSessionHandlers, startStateHandlers, triviaStateHandlers, helpStateHandlers);
  alexa.execute();
};

var startStateHandlers = Alexa.CreateStateHandler(GAME_STATES.START, {
  "StartGame": function (isNewGame) {
    var that = this;
    var speechOutput = isNewGame ? "Welcome to HTTP Trivia Quiz. I will ask you " + config.gameLength + " questions, try to get as many right as you can. Just say the letter of the answer. Let\'s begin. " : "";

    contentful.getAllQuestions()
      .then(function (items) {
        var state = helper.initGame(items);
        var currentQuestion = state.getCurrentQuestion(items);

        var repromptText = "Question " + state.getQuestionIndexForSpeech() + ". " + currentQuestion.question + " ";
        repromptText += state.createAnswerList(currentQuestion, state);

        speechOutput += repromptText;

        Object.assign(that.attributes, state, {
          repromptText: repromptText,
          correctAnswerText: currentQuestion.correctAnswer
        });

        // Set the current state to trivia mode. The skill will now use handlers defined in triviaStateHandlers
        that.handler.state = GAME_STATES.TRIVIA;
        that.emit(":ask", speechOutput, repromptText);
      })
      .catch(logError);
  }
});

var triviaStateHandlers = Alexa.CreateStateHandler(GAME_STATES.TRIVIA, Object.assign({
  "AnswerIntent": function () {
    handleUserGuess.call(this, false);
  },
  "DontKnowIntent": function () {
    handleUserGuess.call(this, true);
  }
}, otherTriviaSteHandlers));

function handleUserGuess(userGaveUp) {
  var state = helper.decodeState(this.attributes);
  var speechOutput = "";
  var speechOutputAnalysis = "";
  var that = this;

  if (state.isAnswerCorrect(this.event.request.intent)) {
    state.score++;
    speechOutputAnalysis = "correct. ";
  } else {
    if (!userGaveUp) {
      speechOutputAnalysis = "wrong. ";
    }

    speechOutputAnalysis += "The correct answer is " + helper.toLetter(state.correctAnswerIndex) + ": " + state.correctAnswerText + ". ";
  }

  if (state.isGameOver()) {
    speechOutput = userGaveUp ? "" : "That answer is ";
    speechOutput += speechOutputAnalysis + "You got " + state.score.toString() + " out of " + config.gameLength.toString() + " questions correct. Thank you for playing!";

    this.emit(":tell", speechOutput)
  } else {
    state.playRound();

    contentful.getOneQuestion(state.getQuestionId())
      .then(function(currentQuestion) {
        var repromptText = "Question " + state.getQuestionIndexForSpeech() + ". " + currentQuestion.question + " ";

        repromptText += state.createAnswerList(currentQuestion);

        speechOutput += userGaveUp ? "" : "That answer is ";
        speechOutput += speechOutputAnalysis + "Your score is " + state.score.toString() + ". " + repromptText;

        Object.assign(that.attributes, state, {
          repromptText: repromptText,
          correctAnswerText: currentQuestion.correctAnswer
        });

        that.emit(":ask", speechOutput, repromptText);
      })
      .catch(logError);
  }
}
