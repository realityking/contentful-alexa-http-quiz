'use strict';

var contentful = require('contentful');

module.exports = function createClient(config) {
  var client = contentful.createClient(config.contentful);

  return {
    getAllQuestions: function getQuestion() {
      return client.getEntries({
        "content_type": "question",
        limit: 100
      })
        .then(function (result) {
          return result.items;
        });
    },

    getOneQuestion: function getOneQuestion(id) {
      return client.getEntry(id);
    },

    getAllFacts: function() {
      return client.getEntries({
        "content_type": "fact",
        limit: 100
      })
        .then(function (result) {
          return result.items;
        });
    }
  }
};
