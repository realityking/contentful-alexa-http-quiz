'use strict';

module.exports = function (config) {
  const helper = require('./helpers')(config);

  return {
    newGame() {
      return "Welcome to San Francisco Quiz. I will ask you " + config.gameLength + " questions, try to get as many right as you can. Just say the letter of the answer. Let\'s begin. "
    },
    endGame(score) {
      return "You got " + score.toString() + " out of " + config.gameLength.toString() + " questions correct. Thank you for playing!";
    },
    correctAnswer(state) {
      return "The correct answer is " + helper.toLetter(state.correctAnswerIndex) + ": " + state.correctAnswerText + ". ";
    }
  };
};