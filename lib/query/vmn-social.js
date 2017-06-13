var request = require("request");

var wolfMoonURL = 'https://f9768898-c646-496c-bdb0-f6d5848df777-bluemix:e66b8a5b172b17e3c3725bea3de9a8bb4de63fbd522247f99c404ecd895f1e30@f9768898-c646-496c-bdb0-f6d5848df777-bluemix.cloudant.com/wolf-moon-tweets/_design/wolf-moon-tweets/_view/'
var riddledURL = 'https://f9768898-c646-496c-bdb0-f6d5848df777-bluemix:e66b8a5b172b17e3c3725bea3de9a8bb4de63fbd522247f99c404ecd895f1e30@f9768898-c646-496c-bdb0-f6d5848df777-bluemix.cloudant.com/riddled-tweets/_design/riddled-tweets/_view/'
var lieAbilityURL = 'https://f9768898-c646-496c-bdb0-f6d5848df777-bluemix:e66b8a5b172b17e3c3725bea3de9a8bb4de63fbd522247f99c404ecd895f1e30@f9768898-c646-496c-bdb0-f6d5848df777-bluemix.cloudant.com/lie-ability-tweets/_design/lie-ability-tweets/_view/'
var externalSourcesURL = 'https://f9768898-c646-496c-bdb0-f6d5848df777-bluemix:e66b8a5b172b17e3c3725bea3de9a8bb4de63fbd522247f99c404ecd895f1e30@f9768898-c646-496c-bdb0-f6d5848df777-bluemix.cloudant.com/enriched-external-sources/_design/enriched-external-sources/_view/'

function getSocial(url, name, callback) {
  var context = {};
  request.get({
    url: url + "sentiment?group=true",
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }

    var data = JSON.parse(body);
    var negativeTweets = data["rows"][0]["value"];
    var neutralTweets = data["rows"][1]["value"];
    var positiveTweets = data["rows"][2]["value"];
    var sentimentSum = (negativeTweets + neutralTweets + positiveTweets);

    var negativeRatio = (negativeTweets / sentimentSum) * 100;
    var neutralRatio = (neutralTweets / sentimentSum) * 100;
    var positiveRatio = (positiveTweets / sentimentSum) * 100;

    context.sentiment = JSON.parse(body);

    context.sentiment.negativeRatio = negativeRatio;
    context.sentiment.neutralRatio = neutralRatio;
    context.sentiment.positiveRatio = positiveRatio;

    request.get({
      url: url + "keywords?group=true",
    }, function(err, response, body) {

      if (err) {
        return callback(err);
      }


      var data = JSON.parse(body);
      data.rows.sort(function(a, b) {
        return b.value - a.value;
      });
      context.keywords = data;

      request.get({
          url: url + "concepts?group=true",
        }, function(err, response, body) {
          if (err) {
            return callback(err);
          }
          var data = JSON.parse(body);
          data.rows.sort(function(a, b) {
            return b.value - a.value;
          });
          context.concepts = data;

          request.get({
            url: url + "taxonomy?group=true",
          }, function(err, response, body) {
            var data = JSON.parse(body);
            data.rows.sort(function(a, b) {
              return b.value - a.value;
            });
            context.taxonomy = data;

            request.get({
              url: externalSourcesURL + name,
            }, function(err, response, body) {
              var data = JSON.parse(body);
              context.external_sources = data;
              body.toString();
              context.es_string = body;
              callback(null, {
                context: context
              });
            })
          })
        })
        // render page
    });
  });
};


function getWolfMoonSocial(callback) {
  getSocial(wolfMoonURL, 'wolfMoon', callback);
}


function getRiddledSocial(callback) {
  getSocial(riddledURL, 'riddled', callback);
}

function getLieAbilitySocial(callback) {
  getSocial(lieAbilityURL, 'lieAbility', callback);
}

module.exports = {
  getRiddledSocial: getRiddledSocial,
  getWolfMoonSocial: getWolfMoonSocial,
  getLieAbilitySocial: getLieAbilitySocial
}
