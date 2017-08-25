
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
const Readable = require('stream').Readable;
const request = require('request');
const url = require('url');
const parse = require('xml-parser');
const Entities = require('html-entities').XmlEntities;
const log = require('pino')();

log.level = 'debug';
const entities = new Entities();

const getSubtitlesXML = (xmlURI) => {
  log.debug(`getSubtitlesXML: ${xmlURI}`);
  const xml = url.parse(xmlURI);
  return new Promise((resolve, reject) => {
    if (xml.protocol && xml.protocol.search('http') >= 0) {
      // Its a URL to someithing, get it...
      log.debug(`Loading XML from ${xmlURI}`);
      request.get(xmlURI, (error, response, body) => {
        if (error) {
          reject(error);
        } else {
          log.debug('Loaded XML');
          log.debug('response: ', response.statusCode);
          resolve(body);
        }
      });
    } else {
      reject(new Error('Not able to load file'));
    }
  });
};

const stringToMilliSeconds = (time) => {
  const t = time.split(':');
  let inMS = 0;
  // eslint-disable-next-line no-mixed-operators
  inMS = (parseInt(t[0], 10) * 3600 + parseInt(t[1], 10) * 60 + parseFloat(t[2])) * 1000;
  return inMS;
};

const subtitleXMLtoJSON = (xml) => {
  // Array of objects
  const subtitles = [];
  /*
  const subtitle = {
    begin: '',
    end: '',
    text: '',
  };
  */
  const stJSON = parse(xml);
  if (stJSON.hasOwnProperty('root')) {
    // get 'body' parse children
    log.debug('subtitleXMLtoJSON: stJSON has property root');
    const stItems = [];
    stJSON.root.children.forEach((o) => {
      log.debug('subtitleXMLtoJSON: handling ', o);
      if (o.name === 'body') {
        o.children.forEach((d) => {
          log.debug('subtitleXMLtoJSON: handling ', d);
          if (d.name === 'div') {
            d.children.forEach((p) => {
              log.debug('subtitleXMLtoJSON: handling ', p);
              if (p.name === 'p') {
                stItems.push(p);
              }
            });
          }
        });
      }
    });

    stItems.forEach((p) => {
      const st = {};
      st.begin = stringToMilliSeconds(p.attributes.begin);
      st.end = stringToMilliSeconds(p.attributes.end);
      log.debug('p.children', p.children);
      if (p.children && p.children.length > 0) {
        p.children.forEach((c) => {
          log.debug('Handling c', c);
          if (c.name === 'span' && c.content) {
            st.text = entities.decode(c.content);
            /*
            if (st.text.match(/♪/)) {
              st.type = 'music';
            }
            if (st.text.match(/^\[\.+\]$/)) {
              st.type = 'embelishment';
            }
            */
          }
        });
      } else if (p.content && p.content.length > 0) {
        st.text = entities.decode(p.content);
      }

      // There are cases where we subtitles could have same time, need to merge those
      if (subtitles.length > 0) {
        const lastSubtitle = subtitles[subtitles.length - 1];
        if (st.begin === lastSubtitle.begin && st.end === lastSubtitle.end) {
          lastSubtitle.text = `${lastSubtitle.text} ${st.text}`;
        } else {
          subtitles.push(st);
        }
      } else {
        subtitles.push(st);
      }
    });
  } else {
    log.debug('Invalid Subtitle JSON');
  }
  log.debug('Subtitles: length ', subtitles.length);
  log.trace('Subtitles: ', subtitles);
  return subtitles;
};


/*
 * A readable Stream.
 * Ingests a Subtitle XML file and generates a Readable
 * Stream
 */

class SubtitleStream extends Readable {
  constructor(options, link) {
    super(options);
    this.accumulatedTime = 0;
    this.link = link;
    this.lastTime = 0;
    this.started = false;
    this.json = [];
    this.q = [];
    // Now we need to lad the Subtitles for this Readable stream
  }

  start() {
    const stream = this;
    getSubtitlesXML(stream.link)
      .then((xml) => {
        stream.json = subtitleXMLtoJSON(xml);
        log.debug('SubtitleStream: json length is: ', stream.json.length);
        // Kick the stream so it starts reading...
        stream.push(JSON.stringify(stream.json.shift()));
        stream.started = true;
      })
      .catch((error) => {
        log.error(error);
      });
    return this;
  }
  // eslint-disable-next-line no-unused-vars
  _read(size) {
    // Chunk should be a String of data.
    log.debug('SubtitleStream: Read called (this.json.length)', this.json.length);
//    log.debug('SubtitleStream: Read called (this.json.length)', this.json);
    if (this.json.length > 0) {
      if (this.push(JSON.stringify(this.json.shift()))) {
        log.debug('SubtitleStream: Successfully pushed');
      } else {
        log.debug('Failed to push... (need to restart...)');
      }
    } else if (this.started) {
      log.debug('Finished Stream, pushing null');
      this.push(null);
    }
  }
}
module.exports = SubtitleStream;
