
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


/* A Node Transform Stream  that takes 'Text' inbound and accumulates the text
 * based on the Model (TIMED, GAP, SPEAKER) and determens what level of text to
 * send to Enricher.
 *
 * At the end, takes ALL accumulated text and passes through as a Final Enrichment
 */

const Writable = require('stream').Writable;
const enrichText = require('./Enricher').enrichText;
const sttUtils = require('../enricher/STTDataUtils');
const log = require('pino')();

log.level = 'debug';

/**
 * given a time and interval generate an array of numbers matching interval
 */
function getTimes(time, interval) {
  if (interval > 1000) {
    // eslint-disable-next-line no-param-reassign
    interval /= 1000;
  }
  // Assumes milliseconds
  log.info(`Getting times ${time}, ${interval}`);
  const a = [];
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < time / interval; i++) {
    a.push(i * interval);
  }
  return a;
}

function getEnd(timeline) {
  // Assumes it is sorted... which it should be
  return (timeline[timeline.length - 1].end_time);
}

/** Given a timeline, fill the gaps */
function fillGaps(timeline) {
  // Make sure array is sorted
  log.debug('Timeline is: ', timeline.map(t => ({ start_time: t.start_time, end_time: t.end_time })));
  timeline.sort((a, b) => {
    if (a.start_time < b.start_time) {
      return -1;
    }
    if (a.start_time > b.start_time) {
      return 1;
    }
      // a must be equal to b
    return 0;
  });
    // Copy array
  const finalTimeline = timeline.slice(0);
  log.debug(`Timeline Length ${timeline.length}`);
  // For each object in timeline
  for (let i = 0; i < timeline.length; i++) {
    let inserts = 0;
    //    log.debug(`${timeline[i].end_time} --> ${timeline[i+1].start_time}`);
    if ((i + 1 < timeline.length) && (timeline[i].end_time !== timeline[i + 1].start_time)) {
      const defObj = {
        start_time: timeline[i].end_time,
        end_time: timeline[i + 1].start_time,
        transcript: 'No Text',
      };

      // If its greater than 5 seconds, create a new scene otherwise, just
      // extend the end_time of scene to start_time
      if (timeline[i + 1].start_time - timeline[i].end_time > 5000) {
        log.debug(`INSERTING a TIME GAP: ${i + inserts}`, defObj);
        // Insert the new value and set to final timeline.
        // track each insertion.
        log.debug(`FinalTimeline Length: ${finalTimeline.length}`);
        finalTimeline.splice(i + inserts, 0, defObj);
        log.debug(`FinalTimeline Length: ${finalTimeline.length}`);
        inserts++;
      } else {
        // Just change the end time to be the start_time
        // eslint-disable-next-line no-param-reassign
        timeline[i].end_time = timeline[i + 1].start_time;
      }
    }
  }
  return finalTimeline;
}

/* Goal
 *
 * A set/stream of text comes in.  We accumulate text for a period of time, a 'scene'
 * and then pass it to enrichment.
 * We need to take the Scene and divide it by 'sentence_tone', and then insert the visual recogntion
 * into it as well.
 *
 * All the text we get here is a 'segment'. and will be 'finally' enriched as well.
 *
 * Order of operation:
 *
 * Chunk into Scenes and Enrich, accumulate final enrichment, enrich divide scene by sentence tone
 * and VR RATE into Moments
 *
 * do Vr on the moments.
 *
 * we should emit a sgement/scene/moment enrichment to the DB ...  (or as a single document)
 *
 * Appears to search it must be stored by moment.
 * Also appears we will ahve to create our own View in our app to combine this all
 *
 */

class EnrichmentStream extends Writable {
  constructor(options, enrichmentModel, actuallyEnrich) {
    super(options);

    log.debug('enrichmentModel: ', enrichmentModel);
    /* We support enrichment models of:
     * TIMED - after a timer goes off, we process all accumulated text
     * GAP - wait for a reasonable gap in
     * SPEAKER - change based on speaker change
     */
    this.model = (enrichmentModel) || 'TIMED';
    this.enrich = (typeof actuallyEnrich === 'boolean') ? actuallyEnrich : true;
    log.debug(`Actually Enrich is:  ${this.enrich}`);
    this.accumulatedTime = 0;
    this.lastTime = 0;
    this.interval = 20000;
    this.timegap = 5000;
    this.screenshotInterval = 10; // In seconds
    this.queue = [];
    this._enrichmentTimer = null;
    this.finalTranscript = [];
    // This is the 'segments' metadata
    this.finalMetadata = {

    };
    this.by_timeline_enrichment = [];
    this.textChunk = {
      begin: 0,
      end: 0,
      text: '',
    };
    this.sttRawQueue = [];
    this.startQueueTimer();
    this.textTimeline = [];
    // Times of interest for this media
    this.visualRecognitionQueue = [];
  }

  setVrRate(rate) {
    // Must be in Seconds...
    log.info('setting VR Rate: ', rate);
    if (rate) {
      this.screenshotInterval = (rate > 1000) ? rate / 1000 : rate;
    }
    log.info('setting VR Rate: ', this.screenshotInterval);
  }

  setTimegap(time) {
    // Make sure in Milliseconds
    if (time) {
      this.timegap = (time > 1000) ? time : time * 1000;
    }
  }

  // called externally
  addSttRawData(data) {
    // Save raw STT Data
    // log.debug(data);
    log.debug(`Adding Raw data for ${sttUtils.getStartTime([data])} -> ${sttUtils.getEndTime([data])}`);
    this.sttRawQueue.push(data);
  }

  // Queue Timer
  startQueueTimer() {
    log.debug(`startQueueTimer(): ${this.model}`);
    if (this.model === 'TIMED') {
      this._enrichmentTimer = setTimeout(() => {
        this.lastTime = this.accumulatedTime;
        // increment the timer
        this.accumulatedTime += this.interval;
        log.debug(`Enrichment Timer Fired!${this.accumulatedTime} Queue length is: `, this.queue.length);
        this.timedEnrichment();
        this.startQueueTimer();
      }, this.interval);
    }
  }
  //
  setWKSModel(model) {
    this.wks_model = model;
  }

  // The main Enrichment function.
  timedEnrichment(callback) {
    if (!callback) {
      // eslint-disable-next-line no-param-reassign
      callback = function defaultCallback() {};
    }
    // If queue is 0, do nothing
    if (this.queue.length === 0) {
      log.debug('timedEnrichment: Nothing to do');
      return callback();
    }
    // This is our object to Enrich
    let objToEnrich = {
      'text': '',
    };

    //  At this point, we have stuff in the queue.  Not sure WHAT we have...
    //  but we should pull ALL of it off.
    if (typeof this.queue[0] === 'object') {
      objToEnrich = this.queue.shift();
      // Length should be 0 here...
      log.debug('timedEnrichment Queue length is: ', this.queue.length);
      if (!objToEnrich.hasOwnProperty('begin') && !objToEnrich.hasOwnProperty('end')) {
        objToEnrich.begin = this.lastTime / 1000;
        objToEnrich.end = this.accumulatedTime / 1000;
      }
    } else {
      // Convert to text
      log.debug('timedEnrichment Enriching Text in Queue length:', this.queue.length);
      objToEnrich.text = this.queue.slice(0).join('. ');
      this.queue = [];
      log.debug('timedEnrichment STT RawQueue length is: : ', this.sttRawQueue.length);
      objToEnrich.stt_data = this.sttRawQueue.slice(0);
      this.sttRawQueue = [];
    }
    objToEnrich.wks_model = this.wks_model;
    objToEnrich.speakerTimeline = this._timelineToSpeakers();
    // empty queue.
    // Save the text to the finalTranscript
    //   log.debug('Saving for final... '+ objToEnrich.text)
    this.finalTranscript.push(objToEnrich.text);
    // enrich the text
//    log.debug('Enriching object: ', objToEnrich);
    this.enrichText(objToEnrich, (err, result) => {
      if (err) {
      //  log.debug('We got an error!', err);
        //  eslint-disable-next-line no-param-reassign
        result = err;
      } else {
        log.debug(`enrichmentStream Received Enriched result: ${result.start_time} -> ${result.end_time} keys: ${Object.keys(result).length}`);
        log.trace('enrichmentStream result: ', result);
        if (!result.start_time) {
          // Convert to Seconds
        //  eslint-disable-next-line no-param-reassign
          result.start_time = this.lastTime / 1000;
        }
        if (!result.end_time) {
        //  eslint-disable-next-line no-param-reassign
          result.end_time = this.accumulatedTime / 1000;
        }
        // Save Enriched data
        this.by_timeline_enrichment.push(result);
      }
      this.emit('enricheddata', result);
      return callback();
      // Publish data to intested UI parties
    });
    return null;
  }

  // called to enrich text
  // eslint-disable-next-line class-methods-use-this
  enrichText(text, callback) {
    enrichText(text, callback);
  }

  _timelineToSpeakers() {
    const timeline = [];
    let accumulator = {
      begin: 0,
      end: 0,
      text: '',
    };
    // log.debug('timelineToSpeakers: 1 ', this.textTimeline);
    const currentTL = this.textTimeline.slice(0);
    this.textTimeline = [];

    for (let i = 0; i < currentTL.length; i++) {
      const ccObject = currentTL[i];
      //  log.debug('timelineToSpeakers: 2 ', ccObject);
      const newSpeaker = ccObject.text.match(/^>>(.+$)/);
      if (newSpeaker) {
        //   log.debug('timelineToSpeakers: 3(new Speaker) ', ccObject);
        const objToPush = {};
        Object.assign(objToPush, accumulator);
        accumulator = ccObject;
        // Push the start of a new speaker
        // this.visualRecognitionQueue.push(ccObject.begin);
        // Add a space to end of this.
        accumulator.text = `${newSpeaker[1]} `;
        timeline.push(objToPush);
      } else {
        if (accumulator.begin === 0) {
          // save the beginning
          accumulator.begin = ccObject.begin;
        }
        accumulator.end = ccObject.end;
        // Add a period for Sentence
        accumulator.text += `${ccObject.text} `;
      }
      // log.debug('timelineToSpeakers: 3(accumulator) ', accumulator);
    }
    // log.debug('timelineToSpeakers: 4(timeline) ', timeline);
    return timeline;
  }

  _chunkBySpeaker(ccObject) {
    // If it is a Speaker Start... Push previosu object.
    const newSpeaker = ccObject.text.match(/^>>(.+$)/);
    if (newSpeaker) {
      const objToPush = {};
      Object.assign(objToPush, this.textChunk);
      this.textChunk = ccObject;
      // Push the start of a new speaker
      // this.visualRecognitionQueue.push(ccObject.begin);
      // Add a space to end of this.
      this.textChunk.text = `${newSpeaker[1]} `;
      this.queue.push(objToPush);
      this.timedEnrichment();
    } else {
      if (this.textChunk.begin === 0) {
        // save the beginning
        this.textChunk.begin = ccObject.begin;
      }
      this.textChunk.end = ccObject.end;
      // Add a period for Sentence
      this.textChunk.text += `${ccObject.text} `;
    }
    return this;
  }

  _chunkByTimeGap(ccObject) {
    // If it is a Speaker Start... Push previosu object.
    this.textTimeline.push(ccObject);
    const elapsedTime = (parseInt(this.textChunk.begin, 10) === 0) ?
      0 :
      parseInt(ccObject.begin, 10) - parseInt(this.textChunk.end, 10);
    log.trace(`_chunkByTimeGap: elapsedTime (${this.timegap})`, elapsedTime);
    // Save the end time of last date
    this.accumulatedTime = ccObject.end;
    //    log.debug(`ELAPSED TIME: ${elapsedTime} (${ccObject.begin} - ${this.textChunk.end})`);
    // Put all beginning
    if (ccObject.type === 'music' || ccObject.type === 'embelishment') {
      log.debug('Skipping -- Music or Embelishment');
    } else if (elapsedTime >= this.timegap) {
      // We need to push what we have.
      const objToPush = {};
      Object.assign(objToPush, this.textChunk);
      // Save the last object
      this.textChunk = ccObject;
      // Remove all '>>' everywhere
      objToPush.text = `${objToPush.text.replace('>>', ' ').toLowerCase()} `;
      // Push our object to enrich.
      this.queue.push(objToPush);
      this.timedEnrichment();
    } else {
      if (this.textChunk.begin === 0) {
        // save the beginning
        this.textChunk.begin = ccObject.begin;
      }
      this.textChunk.end = ccObject.end;
      // Add a period for Sentence
      this.textChunk.text += `${ccObject.text.replace('>>', ' ')} `;
      log.debug('chunkByTimegap: EnrichmentStream chunk is: ', this.textChunk);
    }
    //    log.debug('GAP:  ', this.textChunk);
    return this;
  }

  _write(data, encoding, callback) {
    // Chunk should be a String of data.
    log.trace(`EnrichmentStream using model: ${this.model}`);
    log.debug('EnrichmentStream _transform read: ', data.length);
    log.debug('_transform: EnrichmentStream Queue is now: ', this.queue.length);
    let objToPush = null;
    let textObject = null;
    // Reset enrichment timer to wait until we get more data...
    // This breaks when using STT
   //    this.resetFinalEnrichmentTimer();
    if (this.model === 'TIMED') {
      if (encoding === 'buffer') {
        objToPush = data.toString('utf8');
      } else {
        log.debug('_transform TIMED, but not a buffer? ', data);
      }
      log.debug('_transform: Pushing ', objToPush);
      this.queue.push(objToPush);
      log.debug('_transform: EnrichmentStream Queue is now: ', this.queue.length);
      callback(null, data);
    } else if (this.model === 'SPEAKER') {
      textObject = JSON.parse(data);
      this._chunkBySpeaker(textObject);
      callback(null, data);
    } else if (this.model === 'GAP') {
      textObject = JSON.parse(data);
      log.trace('EnrichmentStream (GAP) received ', textObject);
      log.debug('EnrichmentStream (GAP) received ', textObject.text);
      // Save to a timeline for searching/mapping later.
      //      log.debug('GAP Start:timeline? ', this.textTimeline);
      this._chunkByTimeGap(textObject);
      callback(null, data);
    } else {
      callback(null, data);
    }
  }

  /* This is to catch a hang when not doing STT at the end
    * Need to investigate what this is doing, not working right w/ STT, increasing to 2 seconds. */
  resetFinalEnrichmentTimer() {
    // Setting to 35 seconds to finalEnrich
    clearTimeout(this._finalEnrichmentTimer);
    this._finalEnrichmentTimer = setTimeout(() => {
      log.debug('Calling finalEnrichment via a Timer');
      this.finalEnrichment();
    }, 35000);
  }

  finalEnrichment(callback) {
    // Final Enrichment is pushing this.textChunk...

    if (!callback) {
      // eslint-disable-next-line no-param-reassign
      callback = function defaultCallback() {};
    }
    log.info('enrichmentStream FinalEnrichment called...');
    if (this.model !== 'TIMED') {
      // Need to push the last textChunk...
      this.queue.push(this.textChunk);
    }
    if (this._enrichmentTimer) {
      clearTimeout(this._enrichmentTimer);
    }
    // process queue
    this.timedEnrichment(() => {
      // Call the final enrichment
      // Join by line feed so it looks better...
      const text = this.finalTranscript.slice(0).join('\n').toLowerCase();
      log.debug('Final Enrichment!', text);
      this.enrichText({
        begin: 0,
        end: this.accumulatedTime,
        text: text,
      }, (err, result) => {
        // this.emit('error', err);
        //      log.debug('FinalTimedEnrichment: ', result);
        // Set the time
        // result.time = this.accumulatedTime;
        // Save Final Enriched data
        this.finalMetadata.by_timeline_enrichment = fillGaps(this.by_timeline_enrichment);
        this.finalMetadata.full_enrichment = (err) || result;
        this.finalMetadata.inferred_tags = (err) ? [] : result.tags;
        // Emit a queue of interesting moments to screencap and VR
        log.debug('finalEnrichment --> ', this.accumulatedTime);
        this.visualRecognitionQueue = getTimes(
          getEnd(this.finalMetadata.by_timeline_enrichment),
          this.screenshotInterval);
        this.emit('visualrecognition', this.visualRecognitionQueue);
        // Publish data to intested UI parties
        this.emit('finalenricheddata', this.finalMetadata);
        callback();
      });
    });
  }

  _flush(callback) {
    log.debug('EnrichmentStream Flush called!');
    clearTimeout(this._finalEnrichmentTimer);
    this.finalEnrichment(callback);
      // cancel timer
  }
}

module.exports = EnrichmentStream;
