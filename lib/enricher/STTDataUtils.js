
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
const log = require('pino')();

// Utilities to handle dealing w/ Speech To Text data.

/**
 * sttData is an array of RAW final Results objects... They should be in order of first to last
 */
const getStartTime = (sttData) => {
  let startTime = null;
  log.debug('getStartTime');
  if (sttData) {
    const data = sttData[0].results[0].alternatives[0];
    if (data.hasOwnProperty('timestamps')) {
      // return the first time stamp
      //                   "timestamps": [
      //                    [
      //                  "%HESITATION",
      //                  0.04,
      //                0.14
      //              ],
      log.debug('getStartTime from data timestamps?', data.timestamps);
      if (data.timestamps[0] && data.timestamps[0].length > 0) {
        startTime = data.timestamps[0][1];
      } else {
        log.debug('getStartTime failed ', data);
      }
    }
  }
  log.debug('getStartTime returning', startTime);
  return startTime;
};

/**
 * sttData is an array of RAW final Results objects... They should be in order of first to last
 *
 * We need to start at end and iterate backwards on the time.
 */
const getEndTime = (sttData) => {
  log.debug('getEndTime: sttData  ', sttData.length);
  const endTimeArray = sttData.map(stt => stt.results[0].alternatives[0].timestamps)
    .filter((ts) => {
    // ts should be a Timestamp array of [word, start, stop]
      log.info('ts', ts);
      return (ts.length > 0);
    }).reduce((a, b) =>
//    log.info('a1', a);
    // Flatten them
     a.concat(b), [0, 0, 0]).reduce((a, b) =>
 //    log.info('a2', a);
    // Just reduce down to the biggest timestamp.
     (a[2] > b[2] ? a : b), [0, 0, 0]);
  log.debug('getEndtime: filtered & reduced ', endTimeArray);
  return endTimeArray[2];
};

// Take sttData, wrap in start/stop times.
// Return array of strings w/ speaker timelines??
const generateTranscriptTimeline = (sttData) => {
  if (sttData) {
    return sttData.map(d => ({
      text: d.results[0].alternatives[0].transcript,
      begin: getStartTime([d]),
      end: getEndTime([d]),
    }));
  }
  return [];
};


const findEntityTime = (entity, sttData) => {
  const occurrences = [];
  if (sttData && sttData.length > 0) {
    const data = sttData[0].results[0].alternatives[0];
    // We expect a single word, or a Pair set of entities separated by a space
    // like a name "Hillary Clinton"
    const entities = entity.split(' ');
    if (data.hasOwnProperty('timestamps')) {
      data.timestamps.forEach((item, index, array) => {
        // 0 -> String, 1 -> Start, 2 -> end
        // If we match the first one, grab the next one and see if it matches
        // Does item contain entity?
        if (item[0].toLowerCase().indexOf(entities[0].toLowerCase()) !== -1) {
          if (entities.length === 2) {
            // Look ahead at next entity
            if (array[index + 1][0].toLowerCase().indexOf(entities[1].toLowerCase()) !== -1) {
              log.debug(`!!!!!Found ${entity} at ${item[1]}`);
              // 1 is start time.
              occurrences.push(item[1]);
            }
          }
        }
      });
    }
  }
  //    console.log('RETURNING: ', occurrences);
  return occurrences;
};


module.exports = {
  getStartTime: getStartTime,
  findEntityTime: findEntityTime,
  getEndTime: getEndTime,
  generateTranscriptTimeline: generateTranscriptTimeline,
};
