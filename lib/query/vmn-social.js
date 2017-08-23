const request = require('request');

const wolfMoonURL = 'https://f9768898-c646-496c-bdb0-f6d5848df777-bluemix:e66b8a5b172b17e3c3725bea3de9a8bb4de63fbd522247f99c404ecd895f1e30@f9768898-c646-496c-bdb0-f6d5848df777-bluemix.cloudant.com/wolf-moon-tweets/_design/wolf-moon-tweets/_view/';
const riddledURL = 'https://f9768898-c646-496c-bdb0-f6d5848df777-bluemix:e66b8a5b172b17e3c3725bea3de9a8bb4de63fbd522247f99c404ecd895f1e30@f9768898-c646-496c-bdb0-f6d5848df777-bluemix.cloudant.com/riddled-tweets/_design/riddled-tweets/_view/';
const lieAbilityURL = 'https://f9768898-c646-496c-bdb0-f6d5848df777-bluemix:e66b8a5b172b17e3c3725bea3de9a8bb4de63fbd522247f99c404ecd895f1e30@f9768898-c646-496c-bdb0-f6d5848df777-bluemix.cloudant.com/lie-ability-tweets/_design/lie-ability-tweets/_view/';
const externalSourcesURL = 'https://f9768898-c646-496c-bdb0-f6d5848df777-bluemix:e66b8a5b172b17e3c3725bea3de9a8bb4de63fbd522247f99c404ecd895f1e30@f9768898-c646-496c-bdb0-f6d5848df777-bluemix.cloudant.com/enriched-external-sources/_design/enriched-external-sources/_view/';

function getSocial(url, name, callback) {
  const context = {};
  request.get({
    url: `${url}sentiment?group=true`,
  }, (err, response, body) => {
    if (err) {
      return callback(err);
    }

    const data = JSON.parse(body);
    const negativeTweets = data.rows[0].value;
    const neutralTweets = data.rows[1].value;
    const positiveTweets = data.rows[2].value;
    const sentimentSum = (negativeTweets + neutralTweets + positiveTweets);

    const negativeRatio = (negativeTweets / sentimentSum) * 100;
    const neutralRatio = (neutralTweets / sentimentSum) * 100;
    const positiveRatio = (positiveTweets / sentimentSum) * 100;

    context.sentiment = JSON.parse(body);

    context.sentiment.negativeRatio = negativeRatio;
    context.sentiment.neutralRatio = neutralRatio;
    context.sentiment.positiveRatio = positiveRatio;

    request.get({
      url: `${url}keywords?group=true`,
    }, (err, response, body) => {
      if (err) {
        return callback(err);
      }


      const data = JSON.parse(body);
      data.rows.sort((a, b) => b.value - a.value);
      context.keywords = data;

      request.get({
        url: `${url}concepts?group=true`,
      }, (err, response, body) => {
        if (err) {
          return callback(err);
        }
        const data = JSON.parse(body);
        data.rows.sort((a, b) => b.value - a.value);
        context.concepts = data;

        request.get({
          url: `${url}taxonomy?group=true`,
        }, (err, response, body) => {
          const data = JSON.parse(body);
          data.rows.sort((a, b) => b.value - a.value);
          context.taxonomy = data;

          request.get({
            url: externalSourcesURL + name,
          }, (err, response, body) => {
            const data = JSON.parse(body);
            context.external_sources = data;
            body.toString();
            context.es_string = body;
            callback(null, {
              context: context,
            });
          });
        });
      });
        // render page
    });
  });
}


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
  getLieAbilitySocial: getLieAbilitySocial,
};
