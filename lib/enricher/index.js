
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

/*
const alchemyQuery = require('./Alchemy').alchemyQuery;
const alchemyTone = require('./Alchemy').alchemyTone;
const analyzeSpeakerTone= require('./Alchemy').analyzeSpeakerTone;
*/
const fullAnalysis = require('./NLU').fullAnalysis;
const alchemyTone = require('./NLU').alchemyTone;
const analyzeSpeakerTone = require('./NLU').analyzeSpeakerTone;
const MetaData = require('./MetaData');
const log = require('pino')();

// text should be an object.
const enrich = (data) => {
  // console.log('Data resolves to: ', data);
  let text = null;
  let wksModel = null;
  if (data.hasOwnProperty('text')) {
    text = data.text;
  }

  if (data.hasOwnProperty('wksModel')) {
    log.info('Using Model: ', data.wksModel);
    wksModel = data.wksModel;
  }

  // Instantiate a metadata object
  const metaData = new MetaData(data);
  // In future will chain more things processed...
  // Return a promise...
  return new Promise((resolve, reject) => {
    fullAnalysis(text, wksModel)
    .then((results) => {
      metaData.apply(results);
      return analyzeSpeakerTone(metaData.getSpeakerTimeline());
    })
    .then((resultsArray) => {
      metaData.data.speaker_tone = resultsArray;
      resolve(metaData.getData());
    })
    .catch(reject);
  });
};
// text should be an object.
const enrichTone = (data) => {
  // console.log('Data resolves to: ', data);
  let text = null;
  if (data.hasOwnProperty('text')) {
    text = data.text;
  }
  // Instantiate a metadata object
  const metaData = new MetaData(data);
  // In future will chain more things processed...
  // Return a promise...
  return new Promise((resolve, reject) => {
    alchemyTone(text)
    .then((results) => {
      metaData.apply(results);
      resolve(metaData.getData());
    })
    .catch(reject);
  });
};
module.exports = {
  enrich: enrich,
  enrichTone: enrichTone,
};
