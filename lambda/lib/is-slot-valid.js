'use strict';

module.exports = function (LETTER_TO_NUMBER) {
  return function isAnswerSlotValid(intent) {
    var answerSlotFilled = intent && intent.slots && intent.slots.Answer && intent.slots.Answer.value;
    return answerSlotFilled && LETTER_TO_NUMBER[intent.slots.Answer.value[0].toUpperCase()] !== undefined;
  }
};
