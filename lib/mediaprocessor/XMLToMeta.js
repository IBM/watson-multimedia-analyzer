
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
const parse = require('xml-parser');
const log = require('pino')();

log.level = 'debug';

function getChannelMetadata(channel) {
  const md = {};
  channel.children.forEach((obj) => {
    if (obj.name !== 'item' && obj.name !== 'image') {
      md[`channel_${obj.name}`] = obj.content;
    }
  });
  return md;
}

function ItemToMetadata(item) {
  // Some content providers will provide SEGMENTS in the item ( so multiple media files
  // & info per file)  How do we store it, need to introspect the item.
  //
  log.debug('item: ', item);
  const md = {};
  md.segments = [];
  let media = {};
  let finalMetadata = false;
  item.children.forEach((obj) => {
    // Special case if you get a 'enclosure attribute'
    if (obj.name === 'enclosure') {
      md.enclosure = {
        length: obj.attributes.length,
        type: obj.attributes.type,
        url: obj.attributes.url,
      };
    } else if (obj.name.search(/^media/) !== -1) {
      // If it has title, create push old object, create new one.
      if (obj.name.search(/:title$/) !== -1) {
        // If current object has a title, push it.
        if (media.hasOwnProperty('title')) {
          // Push old object
          md.segments.push(media);
          // reset media;
          media = {};
        }
      }
      if (obj.name.search(/:license$/) !== -1) {
        // If current object has a title, push it.
        if (media.hasOwnProperty('title')) {
          // Push old object
          md.segments.push(media);
          media = {};
          finalMetadata = true;
        }
      }
      const m = obj.name.match(/^media:(\S+$)/);
      if (m) {
        // key = m[1]
        log.debug(`Processing media Match for key ${m[1]}`);
        if (finalMetadata) {
          md[m[1]] = obj.content;
        } else if (typeof obj.content === 'string') {
          media[m[1]] = obj.content;
        } else {
          media[m[1]] = obj.attributes;
        }
      }
    } else {
      md[obj.name] = obj.content;
    }
  });

  // If we have a media.title, we should pusthi media to segemnts
  // For the case of a single segment...
  if (media.title) {
    md.segments.push(media);
  }

  log.debug('---------------------------------------------');
  log.debug(md);
  log.debug('---------------------------------------------');
  return md;
}

module.exports = function XMLtoMeta(xmlFile) {
  const obj = parse(xmlFile);
  let metaDataArray = [];
  const mainObj = obj.root.children[0];
  if (mainObj.name === 'channel') {
    const baseMetadata = getChannelMetadata(mainObj);
    // this is disabled because it is a FILTER!
    /* eslint array-callback-return:0 consistent-return:0 */
    metaDataArray = mainObj.children.filter((a) => {
      if (a.name === 'item') {
        return a;
      }
    }).map((a) => {
      log.debug('After Filter:', a);
      return ItemToMetadata(a);
    }).map((a) => {
      log.debug('After Conversion', a);
      const newObj = {};
      Object.assign(newObj, baseMetadata);
      Object.assign(newObj, a);
      return newObj;
    });
  }
  return metaDataArray;
};
