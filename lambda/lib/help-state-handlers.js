'use strict';

var Alexa = require('alexa-sdk');

module.exports = function (config, GAME_STATES) {
  return Alexa.CreateStateHandler(GAME_STATES.HELP, {
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
};
