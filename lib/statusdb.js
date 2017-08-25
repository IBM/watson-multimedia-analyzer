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
const cloudant = require('cloudant');
require('dotenv').load({ silent: true });
const log = require('pino')();
const cfenv = require('cfenv');

const appEnv = cfenv.getAppEnv();

log.info('AppEnv is:', appEnv);
const cloudantCredentials = appEnv.getServiceCreds(/[c|C]loudant/);
log.info('cloudantCredentials', cloudantCredentials);
// Initialize the library with my account.

let dbName = process.env.DB_NAME || 'multimedia-enrichment';
dbName += '_status';

const dbConfig = cloudantCredentials || {
  url: process.env.DB_URL,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
};

const cdb = cloudant(dbConfig);
// eslint-disable-next-line no-unused-vars
cdb.db.create(dbName, (err, res) => {
  if (err) {
    log.info(`${dbName} Database already created!`);
  }
});

const db = cdb.use(dbConfig.dbName);
// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(minimum, maximum) {
  const min = Math.ceil(minimum);
  const max = Math.floor(maximum);
  return (Math.floor(Math.random() * (max - min)) + min);
}
  // define trying again...
function trySaveAgain(id, document, callback) {
  log.debug('Save failed, trying again');
  setTimeout(() => {
// eslint-disable-next-line no-use-before-define
    saveDocument(id, document, callback);
  }, getRandomInt(1000, 5000));
}

function saveDocument(id, document, callback) {
  /* eslint  no-param-reassign: 0 */
  // console.log('Trying to save document: ', document);
  if (!id) {
    // Generated random id
    id = '';
  }
  // First try to insert
  db.insert(document, id, (error, body) => {
    if (error) {
      if (error.statusCode === 409) {
        // Update conflict -- get rev
        log.debug(`Id Exists, updating...${id}`);
        db.get(id, (err, doc) => {
          if (!err) {
            document._rev = doc._rev;
            if (document.visual_recognition && doc.visual_recognition) {
              if (document.visual_recognition.length < doc.visual_recognition.length) {
                document.visual_recogntion = doc.visual_recognition;
              }
            }
            db.insert(document, id, callback);
          } else if (err.statusCode === 429 ||
                err.code === 'ETIMEDOUT' ||
                err.code === 'EPIPE') {
            trySaveAgain(document, id, callback);
          }
        });
      } else if (error.statusCode === 429 ||
                error.code === 'ETIMEDOUT' ||
                error.code === 'EPIPE') {
        trySaveAgain(document, id, callback);
      } else {
        callback(error);
      }
    } else {
      callback(null, body);
    }
  });
}

const loadDocument = function loadDocument(id, callback) {
  log.debug('Trying to load document: ', id);
  db.get(id, callback);
};

// Get all media based on
const getEnrichmentState = function getEnrichmentState(id, callback) {
  const viewName = 'entries';
  const params = {
    keys: [],
    include_docs: true,
  };
  log.debug('getEnrichmentState params: ', params);
  params.keys.push(id);
  db.view('state', viewName, params, (err, result) => {
    if (err) {
      log.debug('getEnrichmentState ERROR', err);
      callback(err);
    } else {
      log.debug('getEnrichmentState ', result);
      callback(null, result);
    }
  });
};

const getDB = function getDB() {
  return db;
};

module.exports = {
  getDB: getDB,
  saveDocument: saveDocument,
  save: saveDocument,
  loadDocument: loadDocument,
  getEnrichmentState: getEnrichmentState,
};
