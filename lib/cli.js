
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

const program = require('commander');
const mediaProcessor = require('./mediaprocessor');
const fs = require('fs');

const db = require('./database');

const start = (p, callback) => {
  let mp = null;

  let complete = false;

  process.on('uncaughtException', (error) => {
    console.error('An uncaughtException occurred', error);
  });

  const options = {
    stt: false,
    vr: false,
    model: 'TIMED',
  };

  console.log('useSTT: ', p.useStt);
  if (typeof p.useStt === 'boolean') {
    options.stt = p.useStt;
  }

  console.log('useVR: ', p.useVr);
  if (typeof p.useVr === 'boolean') {
    options.vr = p.useVr;
  }

  if (p.vrRate) {
    // Should be in seconds, normalize if not.
    options.vr_rate = (p.vrRate > 1000) ? p.vrRate / 1000 : p.vrRate;
  }

  if (p.enrichmentModel) {
    options.model = p.enrichmentModel;
  }

  if (p.timeGap) {
    options.timegap = p.timeGap;
  }

  if (p.xmlFile) {
    console.log(`Loading data from ${p.xmlFile}`);
    mp = mediaProcessor.processMediaFromXML(p.xmlFile, options);
  } else if (p.mediaFile) {
    console.log(`Processing 1 file only: ${p.mediaFile}`);
    console.log('Processing 1 file with options : ', options);
    mp = mediaProcessor.processMediaFromFile(p.mediaFile, options);
  }

  mp.on('finalenricheddata', (data) => {
    const guid = data.mediaMetadata.guid;
    console.log(`${guid} has finished...`);
    if (p.saveToFile) {
      fs.writeFile(`${guid}.json`, JSON.stringify(data), (err) => {
        if (err) {
          console.log('Saving file failed');
        } else {
          console.log(`Saved to file: ${guid}.json`);
        }
        if (complete) callback();
      });
    }
    if (db) {
      // eslint-disable-next-line no-unused-vars
      db.saveDocument(guid, data, (err, doc) => {
        if (err) {
          console.log(`${guid} - failed to write to DB`, err.reason);
          console.log(`${guid} - failed to write to DB`, err);
        } else {
          console.log(`${guid} - write to DB SUCCESS`);
        }
        if (complete) callback();
      });
    }
    if (!db && !p.saveToFile) {
      console.log('Not saving data...');
      if (complete) callback();
    }
  });

  mp.on('complete', () => {
    console.log('COMPLETE');
    complete = true;
  });
};

const cli = (argv, callback) => {
  // Define the command line options
  program
    .option('-o, --save-to-file', 'save to file')
    .option('-S, --use-stt', 'use STT')
    .option('-V, --use-vr', 'Use Visual Recognition')
    .option('-r, --vr-rate <i>', 'Visual Recognition rate in Seconds (default 10 seconds) ')
    .option('-m, --enrichment-model <s>', 'Enrichment Model')
    .option('-g, --time-gap', 'Time Gap for GAP model')
    .option('-f, --media-file <s>', 'Media File')
    .option('-x, --xml-file <s>', 'XML URI or filename')
    .parse(process.argv);
  start(program, callback);
};
module.exports = cli;
