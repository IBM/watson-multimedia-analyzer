
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

/**
 * The mediaprocessor
 *
 * Ingests XML or a Media file and generates a time based enrichment.  Inserts it into a DB.
 */
// adds copy to fs.
const fs = require('fs.extra');
const EventEmitter = require('events');
const url = require('url');
const request = require('request');
const path = require('path');
const uuid = require('node-uuid');
const ffmpeg = require('fluent-ffmpeg');
const ytdl = require('ytdl-core');

// Our dependencies
const MediaProcessor = require('./MediaProcessor');
const XMLToMeta = require('./XMLToMeta');
const enrichText = require('./Enricher').enrichText;
const db = require('../database');
const statusdb = require('../statusdb');
const log = require('pino')();

// Set loglevel (should make configurable)
log.level = 'debug';

// Define media directory if copying...
const home = 'public/';
const mediaDir = 'media_files/';

/**
 * Define the media types.
 */
// An episode <probably> contains segments (i.e. collection of other Media Files)
const EPISODE = 'episode';
// GENERIC_MEDIA is just a single Media file
const GENERIC_MEDIA = 'media';
// A Segment contains scenes
const SEGMENT = 'segment';
// A Scene contains moments (usually using VR)
const SCENE = 'scene';
// A Moment is created via VR
const MOMENT = 'moment';

// Minimum Metadata is a title/guid/content
const minMediaMetadata = {
  title: '',
  guid: '',
  content: {},
};

// Take a filename and generate minimum metadat from it (presuming we don't have any other data)
const generateMediaMetadata = (file, callback) => {
  const md = {};
  // Clone object
  Object.assign(md, minMediaMetadata);
  if (file.search('youtube') < 0) {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) {
        return callback(err);
      }
        // save the format tag as content.
      Object.assign(md.content, metadata.format);
        // Use basename  we will server from media_files if it is this way.
      md.content.url = path.basename(file);
      md.title = path.basename(file);
      md.guid = path.basename(file);
      return callback(null, md);
    });
  } else {
    // is a youtube URL, or should
    // Typical URL looks like 'http://www.youtube.com/watch?v=asdfwaef')
    // use the last v= as the guid
    ytdl.getInfo(file, (err, info) => {
      if (err) {
        return callback(err);
      }
      md.yt_info = info;
      md.content.url = info.loaderUrl;
      md.guid = info.video_id;
      md.title = info.title;
      md.description = info.description;
      md.keywords = info.keywords;
      return callback(null, md);
    });
  }
};

/**
 * @param xmlURI [string] A URI String where XML file is located
 *
 * @returns Promise Promise contains XML file
 */
const getXML = (xmlURI) => {
  const xml = url.parse(xmlURI);
  let XML = '';
  return new Promise((resolve, reject) => {
    // log.debug('getXML: ', xml);
    if (xml.protocol && xml.protocol.search('http') >= 0) {
      // Its a URL to someithing, get it...
      request.get(xmlURI, (error, response, body) => {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    } else {
      // Must be a path, try to read it as XML
      try {
        XML = fs.readFileSync(xml.path, 'utf8');
        resolve(XML);
      } catch (e) {
        log.error(`Can not read file ${xml.path}:`, e);
        reject(e);
      }
    }
  });
};

// Save the data
const saveEpisode = (episode, fullEnrichment) => {
  // This is the mediaMetadata
  db.save(episode.guid, {
    mediaMetadata: episode,
    type: EPISODE,
    season: (episode.season) ? episode.season : '',
    series: (episode.series) ? episode.series : '',
    fullEnrichment: (fullEnrichment) || {},
  }, (err, msg) => {
    if (err) {
      log.error(err);
    } else {
      log.debug(msg);
    }
  });
};

const saveMedia = media =>
  /* eslint no-param-reassign: 0 */
  // This is the mediaMetadata
   new Promise((resolve, reject) => {
     if (!media.hasOwnProperty('type')) {
       media.type = GENERIC_MEDIA;
     }
     if (media.by_timeline_enrichment) {
       delete media.by_timeline_enrichment;
     }
    // log.debug('Saving media!  ', media);
     db.save(media.mediaMetadata.guid, media, (err, resp) => {
       if (err) {
         log.error('savemedia: Failed!!!', err);
         reject(err);
       } else {
         log.debug('savemedia: Success!', resp);
         resolve(err);
       }
     });
   });

const saveScene = (scene) => {
  // This is the mediaMetadata
  scene.type = SCENE;
  // IF it has moments, save them separately?
  if (scene.moments) {
    scene.moments.forEach((moment) => {
        // Save the guid
      moment.scene = scene.guid;
      moment.guid = `${scene.guid}-${moment.time}`;
      moment.type = MOMENT;
      db.save(moment.guid, moment);
    });
      // Delete scene moments
    delete scene.moments;
  }
  db.save(scene.guid, scene);
};

const saveProcessingState = (id, message) => {
  if (id) {
    const msg = {
      'time': new Date(),
      'uuid': id,
      'message': message,
    };
    statusdb.save(null, msg);
  }
};

/*
 * Mediafile COULD be an actual media file or an Object
 * with information about where to load a file, etc..
 *
 * It must be a single entity to Enrich. (i.e. 1 MP4 file)
 *
 * If there are Subtitles we will use those.
 */
const initMediaProcessor = (mediafile, useSTT, useVR, vrRate) => {
  let options = {};
  if (typeof useSTT === 'object' && typeof useVR === 'undefined') {
    options = useSTT;
  } else {
    options.stt = useSTT;
    options.vr = useVR;
    options.vr_rate = vrRate;
  }
  const mediaProcessor = new MediaProcessor(null, mediafile);
  mediaProcessor.setOptions(options);
  if (typeof mediafile === 'object') {
    log.info(`Starting Enrichment for ${mediafile.guid}`);
    mediaProcessor.start();
  } else if (typeof mediafile === 'string') {
    log.info(`Starting Enrichment for ${mediafile}`);
    mediaProcessor.start(mediafile);
  } else {
    log.debug('mediafile is unknown: ', mediafile);
  }
  return mediaProcessor;
};

/**
 * A segment is essentially one complete 'Media' file.  whatever it is...
 * this will/may be broken up smaller to
 * Scenes and Moments.
 *
 *  @returns Promise
 */
const processMedia = (logid, media, useSTT, useVR, vrRate) => {
  const mediaType = (media.type) ? media.type : GENERIC_MEDIA;
  let options = {};
  if (typeof useSTT === 'object' && typeof useVR === 'undefined') {
    options = useSTT;
  } else {
    options.stt = useSTT;
    options.vr = useVR;
    options.vr_rate = vrRate;
  }

  log.info(`Enriching Media : ${media.title}`);
  saveProcessingState(logid, `Enriching media title: ${media.title}`);
  return new Promise((resolve, reject) => {
    initMediaProcessor(media, options)
      .on('finalenricheddata', (data) => {
        // These will end up out of order
        if (data.by_timeline_enrichment) {
          log.info(`Processing the MEDIAs Timeline...${data.by_timeline_enrichment.length}`);
          saveProcessingState(logid, `Saving ${data.by_timeline_enrichment.length} scenes for media ${media.title}`);
          // eslint-disable-next-line no-plusplus
          for (let i = 0; i < data.by_timeline_enrichment.length; i++) {
            // These are all SCENES.
            const obj = data.by_timeline_enrichment[i];
            log.debug('Handling SCENE: ', obj.start_time);
            obj.type = SCENE;
            // Even though we may not be a 'segment' leaving this way for now.
            obj.segment = data.mediaMetadata.guid;
            obj.guid = `${obj.segment}-${obj.start_time}-${obj.end_time}`;
            log.info('Handling SCENE GUID: ', obj.guid);
            saveScene(obj);
          }
        } else {
          log.debug(`Not processing SCENES, no timeline: ${data.by_timeline_enrichment}`);
        }
        data.type = mediaType;
        data.guid = data.mediaMetadata.guid;
        // Don't apply episode (which is the parent to it unless it is in metadata)
        if (data.mediaMetadata.episode) {
          data.episode = data.mediaMetadata.episode;
        }
        saveMedia(data)
          .then(() => {
            saveProcessingState(logid, `Finished Enriching Media title: ${media.title}`);
            log.info(`${media.title} Finished Enriching Media guid: ${data.guid}`);
            // emitter.emit('finalenricheddata', data);
            resolve(data);
          }).catch((error) => {
            saveProcessingState(logid, `Enriching media failed: ${media.title}`);
            log.error('saveMedia failed.', error);
            resolve(data);
          });
      }).on('error', (error) => {
        reject(error);
      });
  });
};
/**
 * A segment is essentially one complete 'Media' file.  whatever it is...
 * this will/may be broken up smaller to
 * Scenes and Moments.
 *
 */
const processSegment = (logid, segment, useSTT, useVR, vrRate) => {
  // Make sure type is segment
  segment.type = SEGMENT;
  return processMedia(logid, segment, useSTT, useVR, vrRate);
};


// eslint-disable-next-line no-unused-vars
const processEpisode = (logid, episode, useSTT, useVR, vrRate) => new Promise((resolve, reject) => {
  let options = {};
  saveProcessingState(logid, `Enriching Episode: ${episode.guid}`);
  log.info(`Enriching Episode: ${episode.guid}`);
  if (typeof useSTT === 'object' && typeof useVR === 'undefined') {
    options = useSTT;
  } else {
    options.stt = useSTT;
    options.vr = useVR;
    options.vr_rate = vrRate;
  }

  if (episode.hasOwnProperty('segments')) {
      // It is , create one
      // Set guids on segments...
    episode.segments.forEach((segment) => {
      if (segment.content) {
        segment.guid = path.basename(segment.content.url);
      }
    });
    saveEpisode(episode);
    const queue = episode.segments.slice(0);
    let canProcess = true;
    const transcripts = [];

    // eslint-disable-next-line no-inner-declarations
    function processQueue() {
      if (queue.length > 0) {
        if (canProcess) {
          const segment = queue.shift();
          segment.episode = episode.guid;
          canProcess = false;
          saveProcessingState(logid, `Enriching segment: ${segment.guid}`);
          processSegment(logid, segment, options)
              .then((s) => {
                // s is the segment
                canProcess = true;
                saveProcessingState(logid, `Finished enriching segment: ${segment.guid}`);
                log.debug('.processSegment Result is: ', s);
                if (s.fullEnrichment && s.fullEnrichment.transcript) {
                  log.debug('Pushing the enrichment to episode');
                  transcripts.push(s.fullEnrichment.transcript);
                }
              })
              .catch((error) => {
                saveProcessingState(logid, `ERROR: Failed enriching segment: ${segment.guid}: ${error}`);
              });
        }
        setTimeout(processQueue, 1000);
      } else {
        log.debug('ProcessEpisode: Finished Processing segments for episode queue');
            // enrich the WHOLE episode:
        saveProcessingState(logid, `Finished enriching all segments for episode: ${episode.guid}`);
        enrichText({
          text: transcripts.join(' '),
        }, (err, fullEnrichment) => {
            //          log.debug('Episode Enriched', fullEnrichment);
          saveEpisode(episode, fullEnrichment);
          log.info(`Finished Processing episode: ${episode.guid}`);
          saveProcessingState(logid, `Finished enriching episode${episode.guid}`);
          resolve();
        });
      }
    }
    processQueue();
  } else {
    processSegment(null, episode, useSTT, useVR).then(() => {
      resolve();
    });
  }
});

const processMediaFromFile = (filename, useSTT, useVR, vrRate) => {
  const emitter = new EventEmitter();
  // Copy file to media directory...
  // probably a filename
  generateMediaMetadata(filename, (err, md) => {
    if (err) {
      log.error('Failed generating MediaMetadata: ', err);
    } else {
      log.info('Genereated Metadata: ', md);
      // Add the URL to it
      if (md.content.filename) {
        log.info(`Copying file... ${md.content.filename} to ${home + mediaDir}`);
        fs.copy(md.content.filename, home + mediaDir);
        md.content.url = mediaDir + path.basename(md.content.filename);
      }
      // log.info('Processing metadata: ', md);
      processMedia(null, md, useSTT, useVR, vrRate).then((data) => {
        emitter.emit('finalenricheddata', data);
      });
    }
  });
  return emitter;
};

/* Obj can contains {guid: , stt, vr, vr_rate, wks-model, vr-model } */
const processMediaFromGUID = obj => new Promise((resolve, reject) => {
  const logID = uuid.v1();
  if (obj.guid) {
      // Load the doc
    db.loadDocument(obj.guid, (err, doc) => {
      if (err) {
        reject(err);
      } else {
          // Loading the doc worked, it was found!  now...
          // It shoudl be an 'episode'
          // if it is an Episode, walk the segments.
        if (doc.type === 'episode') {
            // Resolve w/ logid to lookup
          processEpisode(logID, doc.mediaMetadata, obj)
              .then(() => {
                saveProcessingState(logID, `Finished Enriching Episode ${obj.guid}`);
              })
              .catch((error) => {
                saveProcessingState(logID, `ERROR: Failed Enriching Episode ${obj.guid}`, error);
              });
        } else if (doc.type === 'segment') {
          processSegment(logID, doc.mediaMetadata, obj)
              .then(() => {
                // s is the segment
                saveProcessingState(logID, `Finished Enriching Segment ${obj.guid}`);
              })
              .catch((error) => {
                saveProcessingState(logID, `ERROR: Failed Enriching Segment ${obj.guid}`, error);
              });
        } else {
          saveProcessingState(logID, `Cannot re-enrich ${doc.type} only types episode & segment`);
          reject(`Cannot re-enrich ${doc.type} only types (episode & segment)`);
        }
        resolve(logID);
      }
    });
  } else {
    reject(`GUID not found ${obj.guid}`);
  }
});

// Given a URI to an XML file ordered like:
// <channel>
//   <item>
//   </item>
//   <item>
//   </item>
// </channel>
// Each Item will be a Thing to enrich (it may contain segments that need
// to be enriched individually.
const processMediaFromXML = (uri, useSTT, useVR) => {
  // Our metadata array to parse
  const emitter = new EventEmitter();
  let meta = [];
  getXML(uri)
    .then((xml) => {
      //      log.debug('Loaded XML: ', xml);
      meta = XMLToMeta(xml);
      // Individual items to process, assuming akin to an episode
      const episodesToProcess = meta.length;
      log.debug(`Loaded XML, will process ${episodesToProcess}`);
      const episodeQueue = meta;
      let canProcess = true;

      function processEpisodeQueue() {
        if (episodeQueue.length > 0) {
          if (canProcess) {
            // Pull an episode off
            const episode = episodeQueue.shift();
            canProcess = false;
            processEpisode(null, episode, useSTT, useVR)
              .then(() => {
                canProcess = true;
              })
              .catch((error) => {
                log.error('processEpisode failed: ', error);
                canProcess = true;
              });
          }
          setTimeout(processEpisodeQueue, 1000);
        } else {
          log.debug('Finished Processing episodes');
        }
      }
      processEpisodeQueue();
    })
    .catch((error) => {
      log.error('Some Error?', error);
    });
  return emitter;
};

module.exports = {
  processMediaFromXML: processMediaFromXML,
  processMediaFromGUID: processMediaFromGUID,
  processMediaFromFile: processMediaFromFile,
};
