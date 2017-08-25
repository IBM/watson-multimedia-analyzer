
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
  silent: true,
});

const naturalLanguageUnderstanding = new NaturalLanguageUnderstandingV1({
  'version_date': '2017-02-27',
});

/**
 * Run Alchemy Entity query With custom model if available
 */
const nluEntities = (text, wksModel) => {
  log.info('nluEntities: wksModel: ', wksModel);
  const params = {
    // Annas custom trained model
    'features': {
      'entities': {
        model: wksModel || process.env.wksModel,
      },
    },
    text: text,
  };
  log.info('nluEntities: params: ', params);

  // eslint-disable-next-line no-unused-vars
  return new Promise((resolve, reject) => {
    if (params.model) {
      // If we have a model configured, do this
      naturalLanguageUnderstanding.entities(params, (err, response) => {
        if (err) {
  // eslint-disable-next-line no-param-reassign
          err.source = 'nluEntities';
          log.error('nluEntities: params: ', params);
          log.error(`nluEntities: ${err.message}`);
          const obj = {
            customEntities: [],
          };
          obj.customEntities.push(err);
          resolve(obj);
        } else {
          resolve(response);
        }
      });
    } else {
      log.debug('nluEntities: no model, skipping');
      resolve({ entities: null });
    }
  });
};

/**
 * Run Alchemy Typed Relations for
 */
const alchemyTypedRelations = (text) => {
  const params = {
    model: process.env.ALCHEMY_MODEL,
    // model: 'ie-en-news',
    text: (text === 'test') ? 'Random test text to enrich' : text,
  };
  // eslint-disable-next-line no-unused-vars
  return new Promise((resolve, reject) => {
    naturalLanguageUnderstanding.typedRelations(params, (err, response) => {
      if (err) {
        // eslint-disable-next-line no-param-reassign
        err.source = 'alchemyTypedRelations';
        log.error(`alchemyTypedRelations: ${err.message}`);
        const obj = {
          typedRelations: [],
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
const analyzeTone = (text) => {
  const toneAnalyzer = watson.tone_analyzer({
    version: 'v3',
    version_date: '2016-05-19',
  });
  const toneObj = {
    tone: {},
  };
  // console.log('analyzeTone on: '+ text);
  // eslint-disable-next-line no-unused-vars
  return new Promise((resolve, reject) => {
    if (toneAnalyzer) {
      toneAnalyzer.tone({
        text: text,
      },
      (err, tone) => {
        if (err) {
  // eslint-disable-next-line no-param-reassign
          err.source = 'analyzeTone';
          log.error(`analyzeTone failed: ${err.message}`);
          resolve({ tone: `Failed ${err.message}` });
        } else {
          // console.log(JSON.stringify(tone, null, 2));
          resolve(Object.assign(toneObj.tone, tone));
        }
      });
    } else {
      log.debug('Tone is not configured');
      resolve({ tone: null });
    }
  });
};

/**
 * Run Alchemy Tone on Text
 */
const analyzeSpeakerTone = (utterances) => {
  log.info('analyzeSpeakerTone:  called with ', utterances);
  if (utterances && utterances.length > 0) {
    return Promise.all(utterances.map((utterance) => {
      log.debug('analyzeSpeakerTone: UTTERANCE?  ', utterance.text);
      let toneResult = null;
      if (utterance.text && utterance.text !== '') {
        // eslint-disable-next-line no-unused-vars
        toneResult = new Promise((resolve, reject) => {
          analyzeTone(utterance.text)
            .then((result) => {
  // eslint-disable-next-line no-param-reassign
              utterance.tone = result;
              resolve(utterance);
            });
        });
      } else {
        toneResult = Promise.resolve();
      }
      return toneResult;
    }));
  }
  return Promise.resolve();
};


/**
 * Run Alchemy Combined Call on text
 */

const combinedCall = (text) => {
  // Combined call
  // ------------
  const parameters = {
    text: (text === 'test') ? 'Random text to enrich for test' : text,
    'features': {
      'concepts': {},
      'entities': {},
      'categories': {},
      'keywords': {},
      'relations': {},
      'sentiment': {},
      'emotion': {},
    },
  };

  return new Promise((resolve, reject) => {
    naturalLanguageUnderstanding.analyze(parameters, (err, response) => {
      if (err) {
        log.trace('Rejected Text: ', parameters.text);
        log.trace('response: ', response);
        // eslint-disable-next-line no-param-reassign
        err.source = 'combinedCall';
        log.error(`CombinedCall failed: ${err.message}`);
        reject(err);
      } else {
        resolve(response);
        // console.log(JSON.stringify(response, null, 2));
      }
    });
  });
};

/**
 * Run Alchemy CombinedCall, then customEntities, then Tone
 */
const fullAnalysis = (text, wksModel) => {
  log.info(`fullAnalysis -> Using  WKS model ${wksModel}`);

  const finalResult = {};
  return combinedCall(text)
    .then((response) => {
      Object.assign(finalResult, response);
      return nluEntities(text, wksModel);
    }).then((response) => {
      const customEntities = {
        customEntities: response.entities,
      };
      Object.assign(finalResult, customEntities);
      /*  Not using typedRelations right now...
      return alchemyTypedRelations(text);
    }).then((response) => {
      Object.assign(finalResult, response);
      */
      return analyzeTone(text);
    }).then((response) => {
      Object.assign(finalResult, response);
      return finalResult;
    })
    .catch((err) => {
      log.error(err);
      log.error('fullAnalysis(error): Returning finalResult');
      return finalResult;
    });
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
    });
};

module.exports = {
  fullAnalysis: fullAnalysis,
  nluEntities: nluEntities,
  alchemyTypedRelations: alchemyTypedRelations,
  alchemyTone: alchemyTone,
  analyzeSpeakerTone: analyzeSpeakerTone,
};
