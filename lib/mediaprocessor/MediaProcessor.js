
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

/* This is the main Media Processor.  It emits a few events
 *  It takes an Input Media file or URL Link and will consume it. If using STT
 *  it will strip/transcode audio to flac and pass to STT
 *
 *  Alternatively, you need a Closed Captioning file.
 *
 *  Once it gets Text it passes it to the EnrichmentStream
 *
 *  Once it gets the results from EnrichmentStream it MAY do VR on the data.
 */
const ffmpeg = require('fluent-ffmpeg');
const ytdl = require('ytdl-core');
const tmp = require('tmp');
const SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
const fs = require('fs');
const path = require('path');
const log = require('pino')();
const cfenv = require('cfenv');

require('dotenv').load({
  silent: true,
});

const EnrichmentStream = require('./EnrichmentStream');
const SubtitleStream = require('./SubtitleStream');
const vr = require('./VisualRecognition');

const appEnv = cfenv.getAppEnv();
const localMediaURL = `http://enrich:enrichit@${appEnv.bind}:${appEnv.port}/`;

log.level = 'debug';

const vrKey = process.env.VR_KEY;
const sttUsername = process.env.STT_USERNAME;
const sttPassword = process.env.STT_PASSWORD;

const EventEmitter = require('events');

/* Merge the visual recognition into the timeline */
function createMoments(enricheddata, vrResults) {
  // each Scene...
  // log.debug('createMoments...', enricheddata);
  enricheddata.by_timeline_enrichment.forEach((obj) => {
    // Each Scene
    log.debug(`Processing obj from timeline ${obj.start_time} -> ${obj.end_time}`);
    // We have some speaker tone segments to apply to our moments.
    // eslint-disable-next-line no-param-reassign
    obj.moments = [];
    let ms = false;
    // If greater than 1000 we are in MilliSeconds
    if (obj.start_time > 1000 || obj.end_time > 1000) {
      ms = true;
    }
    // Go through all VR at each VR
    //
    //
    if (vrResults === null) {
      // TODO:  see if we have VR for this segment already.
      // Try to get VR for this scene...
      //
    }
    vrResults.forEach((image) => {
      log.debug(`Processing Image Time: ${image.images[0].time}`);
      const t = parseInt(ms ? image.images[0].time * 1000 : image.images[0].time, 10);
      // var t = parseInt(image.images[0].time);
      const m = {};
      log.debug(`Converted time to Time: ${t} ${(ms ? 'ms' : 'sec')}`);
      let momentTone = [];
      if (obj.hasOwnProperty('speaker_tone')) {
        momentTone = obj.speaker_tone
          .filter(tone => (t > tone.begin && t < tone.end));
      }
      if (t > obj.start_time && t < obj.end_time) {
        // if we have a moment tone... use it.
        m.time = t;
        m.segment = enricheddata.mediaMetadata.guid;
        m.visual_recognition = image;
        if (momentTone.length > 0) {
          m.text = momentTone[0].text;
          m.tone = momentTone[0];
        }
        log.debug('Returning a Moment: ', m);
        obj.moments.push(m);
      }
    });
    obj.moments.sort((a, b) => {
      if (a.time < b.time) {
        return -1;
      }
      if (a.time > b.time) {
        return 1;
      }
      // a must be equal to b
      return 0;
    });
    log.debug(`Finished Processing the timeline -- created moments: ${obj.moments.length}`);
    log.debug('Finished Processing the timeline obj.moments', obj.moments);
  });
}

class MediaProcessor extends EventEmitter {
  constructor(options, mediaMetadata) {
    super(options);
    // The media we will be processing STT & VR
    this.mediaLink = null;

    // The streams we will use to process it.
    this.sttStream = null;
    this.enrichmentStream = null;

    this.sttOut = null;
    this.model = 'TIMED';
    this._do_stt = false;
    this._use_vr = false;
    this.timegap = 5000;

    if (typeof mediaMetadata === 'object') {
      this.mediaMetadata = mediaMetadata;
      // Find the URL
      if (this.mediaMetadata.hasOwnProperty('enclosure')) {
        this.mediaLink = mediaMetadata.enclosure.url;
      } else if (this.mediaMetadata.hasOwnProperty('content')) {
        //        log.debug('URL: ', this.mediaMetadata);
        if (this.mediaMetadata.content.url) {
          if (this.mediaMetadata.content.url.search('http') < 0) {
            this.mediaLink = localMediaURL + this.mediaMetadata.content.url;
          } else {
            this.mediaLink = this.mediaMetadata.content.url;
          }
        }
        if (typeof this.mediaMetadata.guid === 'undefined') {
          // Endiing regext removes underscore at beginning to it can be saved
          this.mediaMetadata.guid = path.basename(this.mediaLink).replace(/^_/g, '');
        }
        this.guid = this.mediaMetadata.guid;
      } else {
        log.error('no URL: ', this.mediaMetadata);
        throw new Error('Cannot resolve a media URL');
      }
      if (this.mediaMetadata.hasOwnProperty('subTitle')) {
        this.sub_titles_link = this.mediaMetadata.subTitle.url;
        //        log.debug('URL: ', this.sub_titles_link);
        if (this.mediaMetadata.stt) {
          // Do STT anyway:
          this._do_stt = true;
        }
      } else {
        // If no Subtitle link, do STT (unless false)
        // We should only do STT purposefully
        // this._do_stt = true;
      }
    } else {
      this.mediaMetadata = {
        'title': 'unknown',
        'guid': 'unknown',
      };
    }
  }

  setOptions(options) {
    this._use_vr = options.vr;
    this._do_stt = options.stt;
    this.vr_rate = options.vr_rate;
    this.wks_model = options.hasOwnProperty('wks_model') ? options.wks_model : null;
    this.vr_api_key = options.hasOwnProperty('vr_api_key') ? options.vr_api_key : vrKey;
    this.model = options.model ? options.model : 'GAP';
    this.timegap = options.timegap ? options.timegap : 5000;
  }

  useVR(value) {
    this._use_vr = value;
  }
  setVrRate(value) {
    this.vr_rate = value;
  }

  useSTT(value) {
    this._do_stt = value;
  }

  disableSTT() {
    this._do_stt = false;
  }

  _initEnrichmentStream(model, timegap) {
    log.debug('init stream model: ', model);
    log.debug('init stream timegap (if GAP): ', timegap);
    this.enrichmentStream = new EnrichmentStream(null, model);
    this.enrichmentStream.setVrRate(this.vr_rate);
    this.enrichmentStream.setWKSModel(this.wks_model);
    this.enrichmentStream.setTimegap(timegap);
    this.enrichmentStream.on('error', (error) => {
      this.emit('error', error);
    });

    // eslint-disable-next-line no-unused-vars
    this.enrichmentStream.on('enricheddata', (data) => {
      // Usually a scene, add the parent to it
      //  data.segment = this.guid;
      //  data.guid = `${this.guid}-${this.start_time}-${this.end_time}`;
      //  this.emit('enricheddata', data);
    });

    this.enrichmentStream.on('visualrecognition', (data) => {
      // NOTE data come in in 'seconds'
      if (this._use_vr && data.length > 0) {
        log.debug(`Calling Visual Recognition on ${data.length}`);
        vr.doVisualRecognition(this.mediaMetadata, data, this.vr_api_key)
          .then((vrResults) => {
            if (vrResults) {
              log.debug(`Visual Recognition finished: ${vrResults.length}`);
              log.debug('creating Moments ... ');
              createMoments(this._finalEnrichedData, vrResults);
            } else {
              log.debug('Nothing used for Visual Recognition ');
            }
            // this._finalEnrichedData.visual_recognition = visual_recognition;
            this.emit('finalenricheddata', this._finalEnrichedData);
          })
          .catch((error) => {
            log.error('VR FAILED!!!!!', error);
            // no VR Data...
            this.emit('finalenricheddata', this._finalEnrichedData);
          });
      } else {
        log.debug(`Skipping VR! ${data.length}`);
      }
    });

    this.enrichmentStream.on('finish', () => {
      // Call final enrichment
      log.debug('EnrichmentStream finished');
      this.enrichmentStream.finalEnrichment();
    });

    this.enrichmentStream.on('end', () => {
      log.debug('EnrichmentStream end');
    });

    this.enrichmentStream.on('finalenricheddata', (data) => {
      // Set the main data, emit it.
      // eslint-disable-next-line no-param-reassign
      data.mediaMetadata = this.mediaMetadata;
      //      data.speech_to_text = this.sttOut;
      log.debug(`${this.guid} Enrichment Complete ${data.mediaMetadata.guid}`);
      if (this._use_vr) {
        // Wait for VR to complete... save data for post enrichment
        this._finalEnrichedData = data;
      } else {
        this.emit('finalenricheddata', data);
      }
    });
  }

  _initSTTStream() {
    const speechToText = new SpeechToTextV1({
      username: sttUsername,
      password: sttPassword,
    });

    this.sttStream = speechToText.createRecognizeStream({
    //  content_type: 'audio/flac',
      content_type: 'audio/ogg;codecs=opus',
//      content_type: 'audio/wav',
      model: 'en-US_BroadbandModel',
//      model: 'en-US_NarrowbandModel'
        //   model: 'en-US_Conv_noSAD_BroadbandModel'

    });
    // Attach handlers/emitters
    this.sttStream.on('results', (data) => {
      // Only push the final results.
      if (data.results[0] && data.results[0].final && data.results[0].alternatives) {
        //  this.sttOut.push(data);
        this.enrichmentStream.addSttRawData(data);
      }
    });

    this.sttStream.on('error', (error) => {
      console.log(error);
      log.error(error);
      log.error('SttStream threw an error: ', error);
    });

    this.sttStream.on('finish', () => {
      log.debug(`${this.guid} STT Finished(The writable finished)`);
    });

    this.sttStream.on('end', () => {
      log.debug(`${this.guid} STT Ended (The Readable ended)`);
    });
  }

  resolveAudioToLocalStream(metadata) {
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, reject) => {
      if (metadata.yt_info) {
          // is youtube
        log.debug('resolveMedia - downloading from youtube');
          // Create a tmpfile
        tmp.file({
          discardDescriptor: true,
       // eslint-disable-next-line no-unused-vars
        }, (err, tmppath, fd, cleanupCallback) => {
          log.debug('resolveMedia downloading file to tmpfile: ', tmppath);
          ytdl.downloadFromInfo(metadata.yt_info, {
            filter: function ytfilter(f) {
                  // We want the 'FREE codec version'
              return f.container === 'webm' && f.audioEncoding === 'opus';
            },
          })
              .pipe(fs.createWriteStream(tmppath))
              .on('finish', () => {
                log.debug(`ytdownload - downloading from youtube finished: ${tmppath}`);
                resolve(tmppath);
              });
        });
      } else {
        resolve(this.mediaLink);
      }
    });
  }
    // Return a Stream...
  _transcodeAudio(mediaStream) {
    log.debug('_transcodeAudio - Audio Transcoder called!');

    return ffmpeg(mediaStream)
      .audioCodec('libopus')
//      .audioFrequency(8000)
      .noVideo()
      .format('ogg')
      .on('progress', (progress) => {
        log.debug('_transcodeAudio: progress', progress);
      })
      .on('codecData', (data) => {
        log.debug(`Input is ${data.audio} audio with ${data.video} video`);
      })
      .on('start', (commandLine) => {
        log.debug(`Spawned FFmpeg w/ command: ${commandLine}`);
      })
      .on('end', () => {
        log.debug(`${this.guid}done processing input stream`);
      })
      .on('error', (err) => {
        log.debug(`${this.guid}an error happened: ${err.message}`);
        // eslint-disable-next-line no-param-reassign
        mediaStream = null;
        this.emit('error', err);
      });
  }


  resolveTextStream() {
    // Output Text
    // eslint-disable-next-line no-unused-vars
    return new Promise((resolve, reject) => {
      let textStream = null;
      // TODO do STT & Subtitles
      if (this._do_stt) {
        this._initSTTStream();
        this.resolveAudioToLocalStream(this.mediaMetadata)
          .then((mediaLink) => {
            resolve(this._transcodeAudio(mediaLink)
              .pipe(this.sttStream, {
                end: true,
              }));
          });
      } else {
        textStream = new SubtitleStream(null, this.sub_titles_link);
        textStream.start();
        resolve(textStream);
      }
    });
  }

  start() {
    log.debug(`MediaProcessor (useSTT): ${this._do_stt}`);
    log.debug(`MediaProcessor (useVR): ${this._use_vr}`);
    // See if we will do STT
    if (!this._do_stt && !this.sub_titles_link) {
      setTimeout(() => {
        this.emit('finalenricheddata', {
          mediaMetadata: this.mediaMetadata,
        });
        log.debug('No text to enrich');
      }, 300);
      return this;
    }

    this._initEnrichmentStream(this.model, this.timegap);

    // Pipe a text Stream to the enrichment Stream
    this.resolveTextStream().then((textStream) => {
      textStream.pipe(this.enrichmentStream);
    }).catch((e) => {
      log.error('Resolving text stream failed: ', e);
    });
    return this;
  }

  destroy() {
    log.info('MediaStreamProcessor -- destroying');
    this.enrichmentStream = null;
    this.sttStream = null;
  }
}

module.exports = MediaProcessor;
