'use strict';

module.exports = function (config) {
  return function pickGameQuestions(questions) {
    var gameQuestions = [];
    var indexList = [];
    var index = questions.length;

    if (config.gameLength > index){
      throw new Error("Invalid Game Length. Expected " + config.gameLength + "questions but got only " + index + ".");
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
};
