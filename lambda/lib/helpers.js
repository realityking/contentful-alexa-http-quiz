'use strict';

var randomInt = require('./random-int');

var NUMBER_TO_LETTER = ['A', 'B', 'C', 'D', 'E'];
var LETTER_TO_NUMBER = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4
};

function isAnswerSlotValid(intent) {
  var answerSlotFilled = intent && intent.slots && intent.slots.Answer && intent.slots.Answer.value;
  return answerSlotFilled && LETTER_TO_NUMBER[intent.slots.Answer.value[0].toUpperCase()] !== undefined;
}

module.exports = function (config) {
  var pickGameQuestions = require('./pick-questions')(config);
  var populateRoundAnswers = require('./populate-round-answers')(config);

  function TriviaState(data, config) {
    this.questions = data.questions;
    this.currentQuestionIndex = data.currentQuestionIndex;
    this.correctAnswerIndex = data.correctAnswerIndex;
    this.correctAnswerText = data.correctAnswerText;
    this.score = data.score;

    this.playRound = function playRound() {
      this.currentQuestionIndex += 1;
      this.correctAnswerIndex = randomInt(0, config.answerCount - 1);
    };

    this.isGameOver = function isGameOver() {
      return this.currentQuestionIndex == config.gameLength - 1;
    };

    this.isAnswerCorrect = function isAnswerCorrect(intent) {
      var answerSlotValid = isAnswerSlotValid(intent);

      return answerSlotValid && LETTER_TO_NUMBER[intent.slots.Answer.value[0].toUpperCase()] === this.correctAnswerIndex;
    };

    this.getQuestionIndexForSpeech = function getQuestionIndexForSpeech() {
      var questionIndexForSpeech = this.currentQuestionIndex + 1;

      return questionIndexForSpeech.toString();
    };

    this.createAnswerList = function createAnswerList(currentQuestion) {
      var roundAnswers = populateRoundAnswers(currentQuestion, this.correctAnswerIndex);

      var text = '';
      for (var i = 0; i < config.answerCount; i++) {
        text += NUMBER_TO_LETTER[i] + ". " + roundAnswers[i] + ". ";
      }

      this.correctAnswerText = roundAnswers[this.correctAnswerIndex];

      return text;
    };

    this.getQuestionId = function getQuestionId() {
      return this.questions[this.currentQuestionIndex];
    };

    this.getCurrentQuestion = function getCurrentQuestion(items) {
      return items.find(function (question) {
        return question.sys.id === this.questions[this.currentQuestionIndex];
      }.bind(this)).fields;
    };

    this.getQuestionText = function (currentQuestion) {
      let repromptText = "Question " + this.getQuestionIndexForSpeech() + ". " + currentQuestion.question + " ";
      repromptText += this.createAnswerList(currentQuestion);

      return repromptText;
    }
  }

  return {
    initGame: function initGame(items) {
      // Generate a random index for the correct answer, from 0 to ANSWER_COUNT - 1
      var correctAnswerIndex = randomInt(0, config.answerCount - 1);

      return new TriviaState({
        questions: pickGameQuestions(items),
        currentQuestionIndex: 0,
        correctAnswerIndex: correctAnswerIndex,
        score: 0
      }, config);
    },
    decodeState: function decodeState(attributes) {
      return new TriviaState({
        questions: attributes.questions,
        currentQuestionIndex: parseInt(attributes.currentQuestionIndex),
        correctAnswerIndex: parseInt(attributes.correctAnswerIndex),
        correctAnswerText: attributes.correctAnswerText,
        score: parseInt(attributes.score)
      }, config);
    },
    toLetter: function toLetter(number) {
      return NUMBER_TO_LETTER[number];
    }
  };
};
