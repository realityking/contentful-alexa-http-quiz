'use strict';

const Alexa = require('alexa-sdk');
const config = require('./config');
const logError = require('./lib/log-error');

const contentful = require('./lib/contentful-client')(config);
const messages = require('./lib/messages.js')(config);

const GAME_STATES = {
  TRIVIA: "_TRIVIAMODE", // Asking trivia questions.
  START: "_STARTMODE", // Entry point, start the game.
  HELP: "_HELPMODE" // The user is asking for help.
};

const helpStateHandlers = require('./lib/help-state-handlers')(config, GAME_STATES);
const triviaStateHandlers = require('./lib/trvia-state-handlers')(config, GAME_STATES, handleUserGuess);
const newSessionHandlers = require('./lib/other-new-session-state-handlers')(config, GAME_STATES);
const helper = require('./lib/helpers')(config);

exports.handler = function(event, context, callback){
  const alexa = Alexa.handler(event, context);
  alexa.appId = config.appId;
  alexa.registerHandlers(newSessionHandlers, startStateHandlers, triviaStateHandlers, helpStateHandlers);
  alexa.execute();
};

const startStateHandlers = Alexa.CreateStateHandler(GAME_STATES.START, {
  "StartGame": function (isNewGame) {
    let speechOutput = isNewGame ? messages.newGame() : "";

    contentful.getAllQuestions()
      .then((items) => {
        const state = helper.initGame(items);
        const currentQuestion = state.getCurrentQuestion(items);

        let repromptText = state.getQuestionText(currentQuestion);

        speechOutput += repromptText;

        Object.assign(this.attributes, state, {
          repromptText: repromptText,
          correctAnswerText: currentQuestion.correctAnswer
        });

        // Set the current state to trivia mode. The skill will now use handlers defined in triviaStateHandlers
        this.handler.state = GAME_STATES.TRIVIA;
        this.emit(":ask", speechOutput, repromptText);
      })
      .catch(logError);
  }
});

function handleUserGuess(userGaveUp) {
  const state = helper.decodeState(this.attributes);
  let speechOutput = "";
  let speechOutputAnalysis = "";

  if (state.isAnswerCorrect(this.event.request.intent)) {
    state.score++;
    speechOutputAnalysis = "correct. ";
  } else {
    if (!userGaveUp) {
      speechOutputAnalysis = "wrong. ";
    }

    speechOutputAnalysis += messages.correctAnswer(state);
  }

  if (state.isGameOver()) {
    speechOutput = userGaveUp ? "" : "That answer is ";
    speechOutput += speechOutputAnalysis + messages.endGame(state.score);

    this.emit(":tell", speechOutput)
  } else {
    state.playRound();

    contentful.getOneQuestion(state.getQuestionId())
      .then(currentQuestion => {
        let repromptText = state.getQuestionText(currentQuestion);

        speechOutput += userGaveUp ? "" : "That answer is ";
        speechOutput += speechOutputAnalysis + "Your score is " + state.score.toString() + ". " + repromptText;

        Object.assign(this.attributes, state, {
          repromptText: repromptText,
          correctAnswerText: currentQuestion.correctAnswer
        });

        this.emit(":ask", speechOutput, repromptText);
      })
      .catch(logError);
  }
}
