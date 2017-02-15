'use strict';

var shuffleArray = require('./shuffle-array');

module.exports = function (config) {
  return function populateRoundAnswers(question, correctAnswerTargetLocation) {
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
};
