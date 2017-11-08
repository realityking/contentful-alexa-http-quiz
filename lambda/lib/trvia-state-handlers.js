'use strict';

module.exports = function (config, GAME_STATES, handleUserGuess) {
  return {
    "AMAZON.StartOverIntent": function () {
      this.handler.state = GAME_STATES.START;
      this.emitWithState("StartGame", false);
    },
    "AMAZON.RepeatIntent": function () {
      this.emit(":ask", this.attributes["repromptText"], this.attributes["repromptText"]);
    },
    "AMAZON.HelpIntent": function () {
      this.handler.state = GAME_STATES.HELP;
      this.emitWithState("helpTheUser", false);
    },
    "AMAZON.StopIntent": function () {
      this.handler.state = GAME_STATES.HELP;
      const speechOutput = "Would you like to keep playing?";
      this.emit(":ask", speechOutput, speechOutput);
    },
    "AMAZON.CancelIntent": function () {
      this.emit(":tell", "Ok, let\'s play again soon.");
    },
    "Unhandled": function () {
      const speechOutput = "Try saying a number between 1 and " + NUMBER_TO_LETTER[config.answerCount];
      this.emit(":ask", speechOutput, speechOutput);
    },
    "SessionEndedRequest": function () {
      console.log("Session ended in trivia state: " + this.event.request.reason);
    },
    "AnswerIntent": function () {
      handleUserGuess.call(this, false);
    },
    "DontKnowIntent": function () {
      handleUserGuess.call(this, true);
    }
  };
};