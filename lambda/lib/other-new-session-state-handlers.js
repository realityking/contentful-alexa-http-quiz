'use strict';

module.exports = function (config, GAME_STATES) {
  return {
    "LaunchRequest": function () {
      this.handler.state = GAME_STATES.START;
      this.emitWithState("StartGame", true);
    },
    "AMAZON.HelpIntent": function() {
      this.handler.state = GAME_STATES.HELP;
      this.emitWithState("helpTheUser", true);
    },
    "AMAZON.StartOverIntent": function() {
      this.handler.state = GAME_STATES.START;
      this.emitWithState("StartGame", true);
    },
    "Unhandled": function () {
      var speechOutput = "Say start to start a new game.";
      this.emit(":ask", speechOutput, speechOutput);
    }
  };
};
