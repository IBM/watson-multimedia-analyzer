'use strict';
/*
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
const log = require('pino')();

const watson = require('watson-developer-cloud');

require('dotenv').load({
  silent: true
});

var natural_language_understanding = new NaturalLanguageUnderstandingV1({
  'version_date': '2017-02-27'
});

/**
 * Run Alchemy Entity query With custom model if available
 */
const nluEntities = (text, wks_model) => {
  log.info('nluEntities: wks_model: ', wks_model)
  const params = {
    // Annas custom trained model
    'features': {
      'entities': {
         model: wks_model ? wks_model : process.env.WKS_MODEL
      }
    },
    text: text
  };
  log.info('nluEntities: params: ', params)

  return new Promise((resolve, reject) => {
    if (params.model) {
      // If we have a model configured, do this
      natural_language_understanding.entities(params, function(err, response) {
        if (err) {
          err.source = 'nluEntities';
          log.error('nluEntities: params: ', params)
          log.error('nluEntities: ' + err.message);
          var obj = {
            custom_entities: []
          };
          obj.custom_entities.push(err);
          resolve(obj);
        } else {
          resolve(response);
        }
      });
    } else {
      log.debug('nluEntities: no model, skipping');
      resolve({entities: null});
    }
  });
};

/**
 * Run Alchemy Typed Relations for
 */
const alchemyTypedRelations = (text) => {
  const params = {
    model: process.env.ALCHEMY_MODEL,
    //model: 'ie-en-news',
    text: (text === 'test') ? test_text : text,
  };
  return new Promise((resolve, reject) => {
    alchemy_language.typedRelations(params, function(err, response) {
      if (err) {
        err.source = 'alchemyTypedRelations';
        log.error('alchemyTypedRelations: ' + err.message);
        var obj = {
          typedRelations: []
        };
        obj.typedRelations.push(err);
        resolve(obj);
      } else {
        resolve(response);
      }
    });
  });
};

/**
 * Run Alchemy Tone on Text
 */
const analyzeSpeakerTone = (utterances) => {
  log.info('analyzeSpeakerTone:  called with ', utterances);
  if (utterances && utterances.length > 0) {
    return Promise.all(utterances.map((utterance) => {
      log.debug('analyzeSpeakerTone: UTTERANCE?  ', utterance.text)
      if (utterance.text && utterance.text !== '') {
        return new Promise((resolve, reject) => {
          analyzeTone(utterance.text).then((result) => {
            utterance.tone = result;
            resolve(utterance);
          });
        })
      }
    }));
  } else {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  }
}

/**
 * Run Alchemy Tone on Text
 */
const analyzeTone = (text) => {
  var tone_analyzer = watson.tone_analyzer({
    version: 'v3',
    version_date: '2016-05-19'
  });
  const toneObj = {
    tone: {}
  };
  //console.log('analyzeTone on: '+ text);
  return new Promise((resolve, reject) => {
    if (tone_analyzer) {
    tone_analyzer.tone({
        text: text
      },
      function(err, tone) {
        if (err) {
          err.source = 'analyzeTone';
          log.error('analyzeTone failed: ' + err.message);
          resolve({tone: 'Failed '+ err.message});
        } else {
          //console.log(JSON.stringify(tone, null, 2));
          resolve(Object.assign(toneObj.tone, tone));
        }
      });
    } else {
      log.debug('Tone is not configured');
      resolve({tone: null});
    }
  })
}

/**
 * Run Alchemy Combined Call on text
 */

const combinedCall = (text) => {
  // Combined call
  // ------------
  const parameters = {
    text: (text === 'test') ? test_text : text,
    'features': {
      'concepts': {},
      'entities': {},
      'categories': {},
      'keywords': {},
      'relations': {},
      'sentiment': {},
      'emotion': {}
    }
  }

  return new Promise((resolve, reject) => {
    natural_language_understanding.analyze(parameters, function(err, response) {
      if (err) {
        log.trace('Rejected Text: ', parameters.text);
        log.trace('response: ', response);
        err.source = 'combinedCall';
        log.error('CombinedCall failed: ' + err.message);
        reject(err);
      } else {
        resolve(response);
        //console.log(JSON.stringify(response, null, 2));
      }
    });
  });
}

/**
 * Run Alchemy CombinedCall, then customEntities, then Tone
 */
const fullAnalysis = (text, wks_model) => {
  log.info('fullAnalysis -> Using  WKS model ' + wks_model);

  const finalResult = {};
  return combinedCall(text)
    .then((response) => {
      Object.assign(finalResult, response);
      return nluEntities(text, wks_model);
    }).then((response) => {
      var custom_entities = {
        custom_entities: response.entities
      };
      Object.assign(finalResult, custom_entities);
      /*  Not using typedRelations right now...
      return alchemyTypedRelations(text);
    }).then((response) => {
      Object.assign(finalResult, response);
      */
      return analyzeTone(text);
    }).then((response) => {
      Object.assign(finalResult, response);
      return finalResult;
    }).catch((err) => {
      log.error(err);
      log.error('fullAnalysis(error): Returning finalResult');
      return finalResult;
    })
};

/**
 * Run Alchemy Tone analyzer on text
 */
const alchemyTone = (text) => {
  const finalResult = {};
  return analyzeTone(text)
    .then((response) => {
      Object.assign(finalResult, response);
      return finalResult;
    })
};

module.exports = {
  fullAnalysis: fullAnalysis,
  nluEntities: nluEntities,
  alchemyTypedRelations: alchemyTypedRelations,
  alchemyTone: alchemyTone,
  analyzeSpeakerTone: analyzeSpeakerTone
};
