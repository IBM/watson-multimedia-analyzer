
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


const viewdoc = 'enricheddata';

// Get the credentials from the VCAP file sitting in the environment
const appEnv = cfenv.getAppEnv();
log.info('AppEnv is:', appEnv);
const cloudantCredentials = appEnv.getServiceCreds(/[c|C]loudant/);
log.info('cloudantCredentials', cloudantCredentials);
// Initialize the library with my account.

const dbName = process.env.DB_NAME || 'multimedia-enrichment';

const dbConfig = cloudantCredentials || {
  url: process.env.DB_URL,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
};

log.info('dbConfig ', dbConfig);
const cdb = cloudant(dbConfig);

// eslint-disable-next-line no-unused-vars
cdb.db.create(dbName, (err, res) => {
  if (err) {
    log.info(`${dbName} Database already created!`);
  }
  log.info(`Successfully created database:  ${dbName}`);
// eslint-disable-next-line global-require
  const views = require('./db_views/view_doc.json');
// eslint-disable-next-line no-unused-vars
  cdb.use(dbName).insert(views, (error, body) => {
    log.info('Successfully Created views in database');
    if (error) {
      if (error.statusCode === 409) {
        log.info('Views already exist.');
      } else {
        log.error('Failed to create views, you will need to load yourself', error.message);
      }
    }
  });
});

const db = cdb.use(dbName);

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
  if (!callback) {
    callback = function defaultCallback() {};
  }
  console.log('Trying to save document: ', document);
  // Add the save time.
  document.save_time = new Date();
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
            trySaveAgain(id, document, callback);
          }
        });
      } else if (error.statusCode === 429 ||
                error.code === 'ETIMEDOUT' ||
                error.code === 'EPIPE') {
        trySaveAgain(id, document, callback);
      } else {
        callback(error);
      }
    } else {
      callback(null, body);
    }
  });
}

const loadDocument = function loadDocument(id, callback) {
  console.log('Trying to load document: ', id);
  db.get(id, callback);
};

// Get all media based on
const getAllMedia = function getAllMedia(callback) {
  const mediaView = 'new-view-media';
  db.view(viewdoc, mediaView, (err, result) => {
    if (err) {
      console.log('getAllMedia ERROR', err);
      callback(err);
    } else {
      console.log('getAllMedia ', result);
      callback(null, result);
    }
  });
};

// Get all media based on
const getAllEpisodes = function getAllEpisodes(callback) {
  const mediaView = 'episodes_short';
  db.view(viewdoc, mediaView, (err, result) => {
    if (err) {
      console.log('getEpisodes ERROR', err);
      callback(err);
    } else {
      console.log('getEpisodes', result);
      callback(null, result);
    }
  });
};

const getWholeEpisode = function getWholeEpisode(id, callback) {
  const mediaView = 'episodes2';
  console.log(`getWholeEpisode Called: ${id}`);
  const params = {
    keys: [],
    include_docs: true,
  };

  params.keys.push(id);
  db.view(viewdoc, mediaView, params, (err, result) => {
    if (err) {
      console.log('getEpisodes ERROR', err);
      callback(err);
    } else {
      console.log('getEpisodes', result);
      callback(null, result);
    }
  });
};


const getSegmentMetadata = function getSegmentMetadata(id, callback) {
  const mediaView = 'segments';
  console.log(`getSegment Called: ${id}`);
  db.view(viewdoc, mediaView, { keys: [id] }, (err, result) => {
    if (err) {
      console.log('getSegment ERROR', err);
    } else {
      console.log('getSegment', result);
      callback(result);
    }
  });
};

const getSegmentMoments = function getSegmentMoments(id, callback) {
  const mediaView = 'moments_by_segment';
  console.log(`getSegmentMoments Called: ${id}`);
  const params = {
    keys: [],
    include_docs: true,
  };
  params.keys.push(id);
  db.view(viewdoc, mediaView, params, (err, result) => {
//  db.view('videosegments', mediaView, function(err, result) {
    if (err) {
      console.log('getSegment ERROR', err);
      callback(err);
    } else {
      console.log('getSegment', result);
      callback(null, result);
    }
  });
};

const getSegmentScenes = function getSegmentScenes(id, callback) {
  const mediaView = 'scenes';
  console.log(`getSegmentScenes Called: ${id}`);
  const params = {
    keys: [],
    include_docs: true,
  };
  params.keys.push(id);
  db.view(viewdoc, mediaView, params, (err, result) => {
//  db.view('videosegments', mediaView, function(err, result) {
    if (err) {
      console.log('getSegment ERROR', err);
      callback(err);
    } else {
      console.log('getSegment', result);
      callback(null, result);
    }
  });
};

const getEpisodeSegments = function getEpisodeSegments(id, callback) {
  const mediaView = 'segments';
  console.log(`getSegments Called: ${id}`);
  const params = {
    keys: [],
    include_docs: true,
  };
  params.keys.push(id);
  db.view(viewdoc, mediaView, params, (err, result) => {
//  db.view('videosegments', mediaView, function(err, result) {
    if (err) {
      console.log('getSegments ERROR', err);
      callback(err);
    } else {
      console.log('getSegments', result);
      callback(null, result);
    }
  });
};

const query = function query(selector, callback) {
  db.find(selector, (error, result) => {
    callback(error, result);
  });
};

const getCustomEntities = function getCustomEntities(callback) {
  const mediaView = 'custom_entities';
  const params = {
    group: true,
  };

  db.view(viewdoc, mediaView, params, (error, result) => {
    if (error) {
      console.log('customEntities ERROR', error);
      callback(error);
    } else {
      console.log('customEntities', result);
      callback(null, result);
    }
  });
};

const getStats = function getStats(callback) {
  const mediaView = 'summary';
  const params = {
    group: true,
  };
  db.view(viewdoc, mediaView, params, (error, result) => {
    if (error) {
      console.log('getStats ERROR', error);
      callback(error);
    } else {
      console.log('getStats', result);
      callback(null, result);
    }
  });
};

const getVRClasses = function getVRClasses(callback) {
  const mediaView = 'vr_classes';
  const params = {
    group: true,
  };

  db.view(viewdoc, mediaView, params, (error, result) => {
    if (error) {
      console.log('vrClasses ERROR', error);
      callback(error);
    } else {
      console.log('vrClasses', result);
      callback(null, result);
    }
  });
};

// Get all media based on
const getSearches = function getSearches(callback) {
  const mediaView = 'searches';
  const params = {
    include_docs: true,
  };
  db.view('search', mediaView, params, (err, result) => {
    if (err) {
      log.debug('getSearches ERROR', err);
      callback(err);
    } else {
      log.debug('getSearches', result);
      callback(null, result);
    }
  });
};

const getSceneMoments = function getSceneMoments(id, callback) {
  const mediaView = 'moments';
  console.log(`getSceneMoments Called: ${id}`);
  const params = {
    keys: [],
    include_docs: true,
  };
  params.keys.push(id);
  db.view(viewdoc, mediaView, params, (error, result) => {
//  db.view('videosegments', mediaView, function(err, result) {
    if (error) {
      if (error.statusCode === 429) {
        // We timed out, wait a second to save...
        console.log('Limit exceeded on querying VIEW, trying again');
        setTimeout(() => {
          getSceneMoments(id, callback);
        }, getRandomInt(1000, 5000));
      } else {
        console.log('getMoments  ERROR', error);
        callback(error);
      }
    } else {
      console.log('getMoments', result);
      callback(null, result);
    }
  });
};

const getDB = function getDB() {
  return db;
};

module.exports = {
  getDB: getDB,
  query: query,
  saveDocument: saveDocument,
  save: saveDocument,
  loadDocument: loadDocument,
  getAllMedia: getAllMedia,
  getSegmentMetadata: getSegmentMetadata,
  getEpisodeSegments: getEpisodeSegments,
  getSegmentScenes: getSegmentScenes,
  getSegmentMoments: getSegmentMoments,
  getSceneMoments: getSceneMoments,
  getAllEpisodes: getAllEpisodes,
  getWholeEpisode: getWholeEpisode,
  getVRClasses: getVRClasses,
  getCustomEntities: getCustomEntities,
  getSearches: getSearches,
  getStats: getStats,
};
