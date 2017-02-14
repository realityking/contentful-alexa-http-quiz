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

var NUMBER_TO_LETTER = ['A', 'B', 'C', 'D', 'E'];
var LETTER_TO_NUMBER = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4
};

exports.handler = function(event, context, callback){
  var alexa = Alexa.handler(event, context);
  alexa.appId = config.appId;
  alexa.registerHandlers(newSessionHandlers, startStateHandlers, triviaStateHandlers, helpStateHandlers);
  alexa.execute();
};

var helpStateHandlers = require('./lib/help-state-handlers')(config, GAME_STATES);
var otherTriviaSteHandlers = require('./lib/other-trvia-state-handlers')(config, GAME_STATES);
var otherNewSessionStateHandlers = require('./lib/other-new-session-state-handlers')(config, GAME_STATES);
var isAnswerSlotValid = require('./lib/is-slot-valid')(LETTER_TO_NUMBER);
var pickGameQuestions = require('./lib/pick-questions')(config);
var populateRoundAnswers = require('./lib/populate-round-answers')(config);

var newSessionHandlers = Object.assign({
  "LaunchRequest": function () {
    this.handler.state = GAME_STATES.START;
    this.emitWithState("StartGame", true);
  },

  "AMAZON.HelpIntent": function() {
    this.handler.state = GAME_STATES.HELP;
    this.emitWithState("helpTheUser", true);
  }
}, otherNewSessionStateHandlers);

var startStateHandlers = Alexa.CreateStateHandler(GAME_STATES.START, {
  "StartGame": function (newGame) {
    var that = this;
    var speechOutput = newGame ? "Welcome to HTTP Trivia Quiz. I will ask you " + config.gameLength + " questions, try to get as many right as you can. Just say the letter of the answer. Let\'s begin. " : "";

    contentful.getAllQuestions()
      .then(function (items) {
        var gameQuestions = pickGameQuestions(items);
        var currentQuestionIndex = 0;
        var currentQuestion = items.find(function (question) {
          return question.sys.id === gameQuestions[currentQuestionIndex];
        }).fields;

        // Generate a random index for the correct answer, from 0 to ANSWER_COUNT - 1
        var correctAnswerIndex = Math.floor(Math.random() * (config.answerCount));

        var spokenQuestion = currentQuestion.question;
        var roundAnswers = populateRoundAnswers(currentQuestion, correctAnswerIndex);

        var repromptText = "Question 1. " + spokenQuestion + " ";

        for (var i = 0; i < config.answerCount; i++) {
          repromptText += NUMBER_TO_LETTER[i] + ". " + roundAnswers[i] + ". ";
        }

        speechOutput += repromptText;
        var currentScore = 0;

        Object.assign(that.attributes, {
          "speechOutput": repromptText,
          "repromptText": repromptText,
          "currentQuestionIndex": currentQuestionIndex,
          "correctAnswerIndex": correctAnswerIndex,
          "questions": gameQuestions,
          "score": currentScore,
          "correctAnswerText": currentQuestion.correctAnswer
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
  var answerSlotValid = isAnswerSlotValid(this.event.request.intent);
  var speechOutput = "";
  var speechOutputAnalysis = "";
  var gameQuestions = this.attributes.questions;
  var correctAnswerIndex = parseInt(this.attributes.correctAnswerIndex);
  var currentScore = parseInt(this.attributes.score);
  var currentQuestionIndex = parseInt(this.attributes.currentQuestionIndex);
  var correctAnswerText = this.attributes.correctAnswerText;
  var that = this;

  if (answerSlotValid && LETTER_TO_NUMBER[this.event.request.intent.slots.Answer.value[0].toUpperCase()] === correctAnswerIndex) {
    currentScore++;
    speechOutputAnalysis = "correct. ";
  } else {
    if (!userGaveUp) {
      speechOutputAnalysis = "wrong. ";
    }

    speechOutputAnalysis += "The correct answer is " + NUMBER_TO_LETTER[correctAnswerIndex] + ": " + correctAnswerText + ". ";
  }

  // Check if we can exit the game session after GAME_LENGTH questions (zero-indexed)
  if (currentQuestionIndex == config.gameLength - 1) {
    speechOutput = userGaveUp ? "" : "That answer is ";
    speechOutput += speechOutputAnalysis + "You got " + currentScore.toString() + " out of " + config.gameLength.toString() + " questions correct. Thank you for playing!";

    this.emit(":tell", speechOutput)
  } else {
    currentQuestionIndex += 1;
    correctAnswerIndex = Math.floor(Math.random() * (config.answerCount));

    contentful.getOneQuestion(gameQuestions[currentQuestionIndex])
      .then(function(question) {
        var currentQuestion = question.fields;

        // Select and shuffle the answers for each question
        var roundAnswers = populateRoundAnswers(currentQuestion, correctAnswerIndex);

        var spokenQuestion = currentQuestion.question;

        var questionIndexForSpeech = currentQuestionIndex + 1;
        var repromptText = "Question " + questionIndexForSpeech.toString() + ". " + spokenQuestion + " ";

        for (var i = 0; i < config.answerCount; i++) {
          repromptText += NUMBER_TO_LETTER[i] + ". " + roundAnswers[i] + ". ";
        }

        speechOutput += userGaveUp ? "" : "That answer is ";
        speechOutput += speechOutputAnalysis + "Your score is " + currentScore.toString() + ". " + repromptText;

        Object.assign(that.attributes, {
          "speechOutput": repromptText,
          "repromptText": repromptText,
          "currentQuestionIndex": currentQuestionIndex,
          "correctAnswerIndex": correctAnswerIndex,
          "questions": gameQuestions,
          "score": currentScore,
          "correctAnswerText": currentQuestion.correctAnswer
        });

        that.emit(":ask", speechOutput, repromptText);
      })
      .catch(logError);
  }
}
