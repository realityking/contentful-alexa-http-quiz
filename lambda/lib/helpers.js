'use strict';

var NUMBER_TO_LETTER = ['A', 'B', 'C', 'D', 'E'];
var LETTER_TO_NUMBER = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4
};

var randomInt = require('./random-int');

function isAnswerSlotValid(intent) {
  var answerSlotFilled = intent && intent.slots && intent.slots.Answer && intent.slots.Answer.value;
  return answerSlotFilled && LETTER_TO_NUMBER[intent.slots.Answer.value[0].toUpperCase()] !== undefined;
}

function isAnswerCorrect(intent, state) {
  var answerSlotValid = isAnswerSlotValid(intent);

  return answerSlotValid && LETTER_TO_NUMBER[intent.slots.Answer.value[0].toUpperCase()] === state.correctAnswerIndex;

}

module.exports = function (config) {
  var pickGameQuestions = require('./pick-questions')(config);
  var populateRoundAnswers = require('./lib/populate-round-answers')(config);

  return {
    populateRoundAnswers: populateRoundAnswers,
    isAnswerCorrect: isAnswerCorrect,
    initGame: function initGame(items) {
      var gameQuestions = pickGameQuestions(items);
      var currentQuestionIndex = 0;

      // Generate a random index for the correct answer, from 0 to ANSWER_COUNT - 1
      var correctAnswerIndex = randomInt(0, config.answerCount - 1);

      var currentScore = 0;

      return {
        questions: gameQuestions,
        currentQuestionIndex: currentQuestionIndex,
        correctAnswerIndex: correctAnswerIndex,
        score: currentScore
      };
    },
    decodeState: function decodeState(attributes) {
      var gameQuestions = attributes.questions;
      var correctAnswerIndex = parseInt(attributes.correctAnswerIndex);
      var currentScore = parseInt(attributes.score);
      var currentQuestionIndex = parseInt(attributes.currentQuestionIndex);
      var correctAnswerText = attributes.correctAnswerText;

      return {
        questions: gameQuestions,
        correctAnswerIndex: correctAnswerIndex,
        score: currentScore,
        currentQuestionIndex: currentQuestionIndex,
        correctAnswerText: correctAnswerText
      };
    },
    playRound: function playRound(state) {
      state.currentQuestionIndex += 1;
      state.correctAnswerIndex = randomInt(0, config.answerCount - 1);

      return state;
    },
    getCurrentQuestion: function getCurrentQuestion(items, state) {
      return items.find(function (question) {
        return question.sys.id === state.questions[state.currentQuestionIndex];
      }).fields;
    },
    isGameOver: function isGameOver(state) {
      return state.currentQuestionIndex == config.gameLength - 1;
    },
    toLetter: function toLetter(number) {
      return NUMBER_TO_LETTER[number];
    },
    getQuestionIndexForSpeech: function getQuestionIndexForSpeech(state) {
      var questionIndexForSpeech = state.currentQuestionIndex + 1;

      return questionIndexForSpeech.toString();
    }
  };
};
