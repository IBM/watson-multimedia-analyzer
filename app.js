/* eslint-env node */

/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */


//------------------------------------------------------------------------------
// node.js starter application for IBM Cloud
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
const express = require('express');
const bodyParser = require('body-parser');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
const cfenv = require('cfenv');
const auth = require('basic-auth');
const pino = require('express-pino-logger')();
const path = require('path');
const fs = require('fs');

pino.level = 'error';
require('dotenv').load({ silent: true });

const enrich = require('./lib/enricher').enrich;
const enrichTone = require('./lib/enricher').enrich_tone;
const cDB = require('./lib/database');
const statusDB = require('./lib/statusdb');

// create a new express server
const app = express();

const urlencodedParser = bodyParser.urlencoded({ extended: true });
const jsonParser = bodyParser.json();

const users = {
  // Default and REQUIRED.  Do not remove this, you CAN add others though.
  'enrich': { password: 'enrichit' },
};
app.use(pino);
// serve the files out of ./public as our main files
app.use((req, res, next) => {
  const user = auth(req);
  if (!user || !users[user.name] || users[user.name].password !== user.pass) {
    res.set('WWW-Authenticate', 'Basic realm="default"');
    return res.status(401).send();
  }
  return next();
});

// The ui
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.sendStatus(200);
  } else {
    next();
  }
});
// get the app environment from Cloud Foundry
const appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, () => {
  // print a message when the server starts listening
  console.log(`server starting on ${appEnv.url}`);
});

// POST /login gets urlencoded bodies
app.post('/login', urlencodedParser, (req, res) => {
  if (!req.body) return res.sendStatus(400);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  return res.send('welcome');
});


app.get('/media_files/:name', (req, res) => {
  req.log.info('media_files requested: ', req.params.name);
  const file = path.resolve(`${__dirname}/public/media_files/${req.params.name}`);
  // eslint-disable-next-line consistent-return
  fs.stat(file, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
          // 404 Error if file not found
        return res.sendStatus(404);
      }
      res.end(err);
    }
     // Get the range
    const range = req.headers.range;
    if (!range) {
       // 416 Wrong range
      return res.sendStatus(416);
    }
    const positions = range.replace(/bytes=/, '').split('-');
    const start = parseInt(positions[0], 10);
    const total = stats.size;
    const end = positions[1] ? parseInt(positions[1], 10) : total - 1;
    const chunksize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    });

    const stream = fs.createReadStream(file, { start: start, end: end })
        .on('open', () => {
          stream.pipe(res);
        }).on('error', (error) => {
          res.end(error);
        });
  });
});


//
//
// take post an audio file
//
//  We need a way to get a final enrichment
//
//  Final Enricher --
//
//
//
//
// POST /api/enrich gets JSON bodies
// eslint-disable-next-line consistent-return
app.post('/api/enrichTone', jsonParser, (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
//  console.log('Request is:  ', req);
//  res.header("Access-Control-Allow-Headers", "X-Requested-With content-type");
  if (!req.body || Object.keys(req.body).length === 0) {
    req.log.debug('No BODY present -- 400');
    return res.sendStatus(400);
  }
  // process the req.body and pass through enrichment.
  req.log.trace('Enrichment Request Started', req.body);
  enrichTone(req.body)
    .then((results) => {
//      console.log(results);
      res.json(results);
      // console.log('Enrichment Request Finished');
    })
    .catch((reason) => {
      req.log.info('Enrichment was rejected', reason);
      res.sendStatus(500);
//      res.status((reason.code)).send(reason);
    });
});

// POST /api/enrich gets JSON bodies
// eslint-disable-next-line consistent-return
app.post('/api/enrich', jsonParser, (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
//  console.log('Request is:  ', req);
//  res.header("Access-Control-Allow-Headers", "X-Requested-With content-type");
  if (!req.body || Object.keys(req.body).length === 0) {
    req.log.debug('No BODY present -- 400');
    return res.sendStatus(400);
  }
  // process the req.body and pass through enrichment.
  req.log.trace('Enrichment Request Started', req.body);
  enrich(req.body)
    .then((results) => {
//      console.log(results);
      res.json(results);
      // console.log('Enrichment Request Finished');
    })
    .catch((reason) => {
      req.log.error('Enrichment was rejected', reason);
      res.sendStatus(500);
//      res.status((reason.code)).send(reason);
    });
});

// eslint-disable-next-line consistent-return
app.post('/api/query', jsonParser, (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    req.log.info('No BODY present -- 400');
    return res.sendStatus(400);
  }
  // process the req.body and pass through enrichment.
  cDB.query(req.body, (error, results) => {
    res.json(results);
  });
});

/*
 * Accept a JSON body w/ following information
 * { vr : true/false,
 *  vr-time = 5/10 seconds,
 *  UUID: }
 */
const mediaProcessor = require('./lib/mediaprocessor');

// eslint-disable-next-line consistent-return
app.post('/api/mediaprocessor', jsonParser, (req, res) => {
  req.log.trace(req.body);
  res.header('Access-Control-Allow-Origin', '*');
  if (!req.body || Object.keys(req.body).length === 0) {
    req.log.info('No BODY present -- 400');
    return res.sendStatus(400);
  }
  // process the req.body and pass through enrichment.
  req.log.trace('Re-enrichment Request Started', req.body);
  mediaProcessor.processMediaFromGUID(req.body)
    .then((results) => {
      res.json(results);
    })
    .catch((reason) => {
      req.log.error('Enrichment was rejected', reason);
      res.sendStatus(500);
//      res.status((reason.code)).send(reason);
    });
});

app.get('/api/enrichment_state/:log_id', jsonParser, (req, res) => {
  statusDB.getEnrichmentState(req.params.log_id, (error, response) => {
    // Send the response
    if (error) {
      // failed
      req.log.error('error!', error);
    } else {
      req.log.debug('Response!', response);
      res.json(response);
    }
  });
});

app.get('/api/media', jsonParser, (req, res) => {
  cDB.getAllMedia((response) => {
    // Send the response
    res.json(response);
  });
});

app.get('/api/episode/:episode_id', jsonParser, (req, res) => {
  req.log.debug(`...${req.params.episode_id}...`);
  const epId = req.params.episode_id.replace(/___/g, ':');
  req.log.debug(`...Looking up... ${epId}...`);
  cDB.loadDocument(epId, (error, response) => {
    // Send the response
    if (error) {
      // failed
      req.log.error('error!', error);
    } else {
      req.log.debug('Response!', response);
      res.json(response);
    }
  });
});

app.get('/api/episodes', jsonParser, (req, res) => {
  cDB.getAllEpisodes((error, response) => {
    // Send the response
    if (error) {
      // failed
      req.log.error('error!', error);
    } else {
      req.log.debug('Response!', response);
      res.json(response);
    }
  });
});

app.get('/api/segments:episode_id', jsonParser, (req, res) => {
  cDB.getEpisodeSegments(req.params.episode_id, (response, error) => {
    // Send the response
    if (error) {
      // failed
      req.log.error('error!', error);
    } else {
      req.log.debug('Response!', response);
      res.json(response);
    }
  });
});

app.get('/api/segment:segment_id', jsonParser, (req, res) => {
  cDB.getSegmentMetadata(req.params.segment_id, (response) => {
    // Send the response
    res.json(response);
  });
});
app.get('/api/media/:media_id', jsonParser, (req, res) => {
  req.log.debug(`...${req.params.media_id}...`);
  cDB.loadDocument(req.params.media_id, (error, response) => {
    // Send the response
    if (error) {
      // failed
      req.log.error('error!', error);
    } else {
      req.log.debug('Response!', response);
      res.json(response);
    }
  });
});

app.get('/api/scenes/:segment_id', jsonParser, (req, res) => {
  req.log.debug(`...${req.params.segment_id}...`);
  cDB.getSegmentScenes(req.params.segment_id, (error, response) => {
    // Send the response
    if (error) {
      // failed
      req.log.error('error!', error);
    } else {
      req.log.debug('Response!', response);
      res.json(response);
    }
  });
});

app.get('/api/moments/:scene_id', jsonParser, (req, res) => {
  req.log.debug(`...${req.params.scene_id}...`);
  cDB.getSceneMoments(req.params.scene_id, (error, response) => {
    // Send the response
    if (error) {
      // failed
      console.error('error!', error);
    } else {
      console.log('Response!', response);
      res.json(response);
    }
  });
});

app.get('/api/segment_moments/:segment_id', jsonParser, (req, res) => {
  req.log.debug(`...${req.params.segment_id}...`);
  cDB.getSegmentMoments(req.params.segment_id, (error, response) => {
    // Send the response
    if (error) {
      // failed
      console.error('error!', error);
    } else {
      console.log('Response!', response);
      res.json(response);
    }
  });
});

app.get('/api/vr_classes', jsonParser, (req, res) => {
  cDB.getVRClasses((error, response) => {
    // Send the response
    if (error) {
      // failed
      console.error('error!', error);
    } else {
      console.log('Response!', response);
      res.json(response);
    }
  });
});

app.get('/api/stats', jsonParser, (req, res) => {
  cDB.getStats((error, response) => {
    // Send the response
    if (error) {
      // failed
      console.error('error!', error);
    } else {
      console.log('Response!', response);
      res.json(response);
    }
  });
});

app.get('/api/custom_entities', jsonParser, (req, res) => {
  cDB.getCustomEntities((error, response) => {
    // Send the response
    if (error) {
      // failed
      console.error('error!', error);
    } else {
      console.log('Response!', response);
      res.json(response);
    }
  });
});

app.get('/api/searches', jsonParser, (req, res) => {
  cDB.getSearches((error, response) => {
    // Send the response
    if (error) {
      // failed
      console.error('error!', error);
    } else {
      console.log('Response!', response);
      res.json(response);
    }
  });
});

// eslint-disable-next-line consistent-return
app.post('/api/save_search', jsonParser, (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    req.log.info('No BODY present -- 400');
    return res.sendStatus(400);
  }
  cDB.save(null, req.body, (error, response) => {
    // Send the response
    if (error) {
      // failed
      console.error('error!', error);
    } else {
      console.log('Response!', response);
      res.sendStatus(200);
    }
  });
});

module.exports = app;
