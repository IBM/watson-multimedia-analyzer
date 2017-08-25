
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


/* Calls the 'enricher' api */
// Enrichment library
const request = require('request');
// debug called to enrich text
const cfenv = require('cfenv');

const appEnv = cfenv.getAppEnv();
const enrichmentURL = `http://enrich:enrichit@${appEnv.bind}:${appEnv.port}/api/enrich`;
const log = require('pino')();

log.level = 'debug';
const enrichText = (text, callback) => {
  log.debug('.enrichText called with: ', text);
  let data = {
    'text': '',
    'stt_data': '',
  };
  if (typeof text === 'string') {
    data.text = text;
  } else if (typeof text === 'object') {
    data = text;
  } else {
    log.error('Unknown text type for enrichment');
  }
  // Every timer, we do this
  // Save the text to the finalTranscript
  if (data.text !== '') {
    log.debug(`enrichText starting! ${data.begin}`);
    request({
      method: 'POST',
      url: enrichmentURL,
      contentType: 'application/json',
      body: data,
      json: true,
    }, (error, response, body) => {
      if (error) {
        log.error('Error in enrichText: ', error);
        callback(error);
      } else if (response.statusCode !== 200) {
        callback(null, {
          start_time: data.begin,
          end_time: data.end,
          transcript: data.text,
          enrichment_result: body,
        });
      } else {
        callback(null, body);
      }
    });
  } else {
    log.debug('Skipping actual enrichment');
    callback('Nothing to enrich');
  }
};
module.exports = {
  enrichText,
};
