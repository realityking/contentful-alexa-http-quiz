'use strict';

var Alexa = require('alexa-sdk');
var config = require('./config');
var shuffleArray = require('./lib/shuffle-array');
var contentful = require('contentful');

var GAME_STATES = {
  TRIVIA: "_TRIVIAMODE", // Asking trivia questions.
  START: "_STARTMODE", // Entry point, start the game.
  HELP: "_HELPMODE" // The user is asking for help.
};

var client = contentful.createClient(config.contentful);

exports.handler = function(event, context, callback){
  var alexa = Alexa.handler(event, context);
  alexa.appId = config.appId;
  alexa.registerHandlers(newSessionHandlers, startStateHandlers, triviaStateHandlers, helpStateHandlers);
  alexa.execute();
};

var newSessionHandlers = {
  "LaunchRequest": function () {
    this.handler.state = GAME_STATES.START;
    this.emitWithState("StartGame", true);
  },
  "AMAZON.StartOverIntent": function() {
    this.handler.state = GAME_STATES.START;
    this.emitWithState("StartGame", true);
  },
  "AMAZON.HelpIntent": function() {
    this.handler.state = GAME_STATES.HELP;
    this.emitWithState("helpTheUser", true);
  },
  "Unhandled": function () {
    var speechOutput = "Say start to start a new game.";
    this.emit(":ask", speechOutput, speechOutput);
  }
};

var NUMBER_TO_LETTER = ['A', 'B', 'C', 'D', 'E'];
var LETTER_TO_NUMBER = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4
};

var startStateHandlers = Alexa.CreateStateHandler(GAME_STATES.START, {
  "StartGame": function (newGame) {
    var that = this;
    var speechOutput = newGame ? "Welcome to the HTTP Trivia Quiz. I will ask you " + config.gameLength + " questions, try to get as many right as you can. Just say the letter of the answer. Let\'s begin. " : "";

    client.getEntries({
      "content_type": "question",
      limit: 100
    })
      .then(function (result) {
        var items = result.items;
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

        Object.assign(that.attributes, {
          "speechOutput": repromptText,
          "repromptText": repromptText,
          "currentQuestionIndex": currentQuestionIndex,
          "correctAnswerIndex": correctAnswerIndex,
          "questions": gameQuestions,
          "score": 0,
          "correctAnswerText": currentQuestion.correctAnswer
        });

        // Set the current state to trivia mode. The skill will now use handlers defined in triviaStateHandlers
        that.handler.state = GAME_STATES.TRIVIA;
        that.emit(":askWithCard", speechOutput, repromptText, "HTTP Trivia Quiz", repromptText);
      }).catch(function (err) {
        console.error(err);
      });
  }
});

var triviaStateHandlers = Alexa.CreateStateHandler(GAME_STATES.TRIVIA, {
  "AnswerIntent": function () {
    handleUserGuess.call(this, false);
  },
  "DontKnowIntent": function () {
    handleUserGuess.call(this, true);
  },
  "AMAZON.StartOverIntent": function () {
    this.handler.state = GAME_STATES.START;
    this.emitWithState("StartGame", false);
  },
  "AMAZON.RepeatIntent": function () {
    this.emit(":ask", this.attributes["speechOutput"], this.attributes["repromptText"]);
  },
  "AMAZON.HelpIntent": function () {
    this.handler.state = GAME_STATES.HELP;
    this.emitWithState("helpTheUser", false);
  },
  "AMAZON.StopIntent": function () {
    this.handler.state = GAME_STATES.HELP;
    var speechOutput = "Would you like to keep playing?";
    this.emit(":ask", speechOutput, speechOutput);
  },
  "AMAZON.CancelIntent": function () {
    this.emit(":tell", "Ok, let\'s play again soon.");
  },
  "Unhandled": function () {
    var speechOutput = "Try saying a number between 1 and " + NUMBER_TO_LETTER[config.answerCount];
    this.emit(":ask", speechOutput, speechOutput);
  },
  "SessionEndedRequest": function () {
    console.log("Session ended in trivia state: " + this.event.request.reason);
  }
});

var helpStateHandlers = Alexa.CreateStateHandler(GAME_STATES.HELP, {
  "helpTheUser": function (newGame) {
    var askMessage = newGame ? "Would you like to start playing?" : "To repeat the last question, say, repeat. " + "Would you like to keep playing?";
    var speechOutput = "I will ask you " + config.gameLength + " multiple choice questions. Respond with the letter of the answer. " +
      "For example, say A, B, C or D. To start a new game at any time, say, start game. " + askMessage;
    var repromptText = "To give an answer to a question, respond with the number of the answer. " + askMessage;
    this.emit(":ask", speechOutput, repromptText);
  },
  "AMAZON.StartOverIntent": function () {
    this.handler.state = GAME_STATES.START;
    this.emitWithState("StartGame", false);
  },
  "AMAZON.RepeatIntent": function () {
    var newGame = (this.attributes["speechOutput"] && this.attributes["repromptText"]) ? false : true;
    this.emitWithState("helpTheUser", newGame);
  },
  "AMAZON.HelpIntent": function() {
    var newGame = (this.attributes["speechOutput"] && this.attributes["repromptText"]) ? false : true;
    this.emitWithState("helpTheUser", newGame);
  },
  "AMAZON.YesIntent": function() {
    if (this.attributes["speechOutput"] && this.attributes["repromptText"]) {
      this.handler.state = GAME_STATES.TRIVIA;
      this.emitWithState("AMAZON.RepeatIntent");
    } else {
      this.handler.state = GAME_STATES.START;
      this.emitWithState("StartGame", false);
    }
  },
  "AMAZON.NoIntent": function() {
    var speechOutput = "Ok, we\'ll play another time. Goodbye!";
    this.emit(":tell", speechOutput);
  },
  "AMAZON.StopIntent": function () {
    var speechOutput = "Would you like to keep playing?";
    this.emit(":ask", speechOutput, speechOutput);
  },
  "AMAZON.CancelIntent": function () {
    this.emit(":tell", "Ok, let\'s play again soon.");
  },
  "Unhandled": function () {
    var speechOutput = "Say yes to continue, or no to end the game.";
    this.emit(":ask", speechOutput, speechOutput);
  },
  "SessionEndedRequest": function () {
    console.log("Session ended in help state: " + this.event.request.reason);
  }
});

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

    client.getEntry(gameQuestions[currentQuestionIndex])
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

        that.emit(":askWithCard", speechOutput, repromptText, "HTTP Trivia Quiz", repromptText);
      });
  }
}

function isAnswerSlotValid(intent) {
  var answerSlotFilled = intent && intent.slots && intent.slots.Answer && intent.slots.Answer.value;
  return answerSlotFilled && LETTER_TO_NUMBER[intent.slots.Answer.value[0].toUpperCase()] !== undefined;
}

function populateRoundAnswers(question, correctAnswerTargetLocation) {
  var answers = [];
  var incorrectAnswers = shuffleArray(question.incorrectAnswers);

  // Take the first ANSWER_COUNT-1 wrong answers
  for (var i = 0; i < config.answerCount - 1; i++) {
    answers[i] = incorrectAnswers[i];
  }

  // Add the correct answer
  answers.unshift(question.correctAnswer);

  // Swap the correct answer into the target location
  var temp = answers[0];
  answers[0] = answers[correctAnswerTargetLocation];
  answers[correctAnswerTargetLocation] = temp;

  return answers;
}

function pickGameQuestions(questions) {
  var gameQuestions = [];
  var indexList = [];
  var index = questions.length;

  if (config.gameLength > index){
    throw new Error("Invalid Game Length.");
  }

  for (var i = 0; i < questions.length; i++){
    indexList.push(i);
  }

  // Pick GAME_LENGTH random questions from the list to ask the user, make sure there are no repeats.
  for (var j = 0; j < config.gameLength; j++){
    var rand = Math.floor(Math.random() * index);
    index -= 1;

    var temp = indexList[index];
    indexList[index] = indexList[rand];
    indexList[rand] = temp;
    gameQuestions.push(questions[indexList[index]].sys.id);
  }

  return gameQuestions;
}
