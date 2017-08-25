
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
const ffmpeg = require('fluent-ffmpeg');
const ytdl = require('ytdl-core');
const tmp = require('tmp');
const uuid = require('node-uuid');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const watson = require('watson-developer-cloud');
const log = require('pino')();

log.level = 'debug';

const cfenv = require('cfenv');

const appEnv = cfenv.getAppEnv();
const localMediaURL = `http://enrich:enrichit@${appEnv.bind}:${appEnv.port}/`;

require('dotenv').load({
  silent: true,
});

const vrParams = {
  api_key: process.env.VR_KEY,
  version: 'v3',
  version_date: '2016-05-20',
};

let visualRecognition = null;

const screenshotDir = './screenshots';

// Return a timestamp from file
function getTimeStamp(filename) {
  const m = filename.match(/\S+-(\S+)\.png$/);
  return (m) ? m[1] : null;
}

// Delete a file
function deleteFile(filename) {
  try {
    fs.unlink(filename);
  } catch (e) {
    log.error('deleteFile failed: ', e);
  }
}

// Classify an image w/ VR
function classifyVR(filename) {
  log.debug('calling classifyVR: ', filename);
  return new Promise((resolve, reject) => {
    //      params.classifier_ids = ["main_characters_175558967"];
    //      params.threshold = 0.2;
    const params = {};
    try {
      params.images_file = fs.createReadStream(filename);
    } catch (e) {
      reject(e);
    }
    log.debug('calling visualRecognition classify', params);
    visualRecognition.classify(params, (err, res) => {
      if (err) {
        //        log.debug('classifyVR: ' + filename, err);
        reject(err);
      } else {
        //       log.debug('classifyVR: finished');
        res.images.forEach((img) => {
          // eslint-disable-next-line no-param-reassign
          img.time = getTimeStamp(img.image);
        });
        resolve(res);
      }
    });
  });
}

// Call detectFaces VR
function detectFacesVR(filename) {
  // log.debug('calling detectFacesVR');
  return new Promise((resolve, reject) => {
    const params = {};
    try {
      params.images_file = fs.createReadStream(filename);
    } catch (e) {
      reject(e);
    }
    visualRecognition.detectFaces(params, (err, res) => {
      if (err) {
        log.debug(`detectFacesVR: ${filename}`, err);
        reject(err);
      } else {
        // log.debug('detectFacesVR finished');
        res.images.forEach((img) => {
          // eslint-disable-next-line no-param-reassign
          img.time = getTimeStamp(img.image);
        });
        resolve(res);
      }
    });
  });
}

// call RecognizeText
function recognizeTextVR(filename) {
  // log.debug('calling recognizeTextVR');
  return new Promise((resolve, reject) => {
    const params = {};
    try {
      params.images_file = fs.createReadStream(filename);
    } catch (e) {
      reject(e);
    }
    visualRecognition.recognizeText(params, (err, res) => {
      if (err) {
        log.debug(`recognizeTextVR: ${filename}`, err);
        reject(err);
      } else {
        // log.debug('imageKeyworkdsVR finished');
        res.images.forEach((img) => {
          // eslint-disable-next-line no-param-reassign
          img.time = getTimeStamp(img.image);
        });
        resolve(res);
      }
    });
  });
}

// Merge results into single JSON
function mergeImageRecognition(a) {
  // This is two objects, we want to merge the ones in faces array.
  const classify = a[0];
  const faces = a[1];
  const text = a[2];
  if (classify.images.length === 1 && faces.images.length === 1) {
    Object.assign(classify.images[0], faces.images[0]);
    if (text.images.length === 1) {
      Object.assign(classify.images[0], text.images[0]);
    }
  }
  // log.debug(inspect(classify, {color: true, depth: null}));
  return classify;
}

// Execute all of the VR on a file.
function combinedVR(filename) {
  const combo = [];
  return new Promise((resolve, reject) => {
    classifyVR(filename)
      .then((classify) => {
        log.debug('Classify Finished: ', classify);
        combo.push(classify);
        return detectFacesVR(filename);
      })
      .then((faces) => {
        combo.push(faces);
        log.debug('faces: ', faces);
        return recognizeTextVR(filename);
      })
      .then((imagetext) => {
        // log.debug('Finished combinedVR')
        combo.push(imagetext);
        //       log.debug('COMBO! =========');
        //        log.debug(inspect(combo, {color:true, depth: null}));
        resolve(mergeImageRecognition(combo));
      })
      .catch(reject);
  });
}

// Create a Zip file from a list of files. Goal here is to make
// VR work better
function zipList(files) {
  return new Promise((resolve, reject) => {
    const zip = archiver('zip');
    const outfile = `${screenshotDir}/${uuid.v1()}.zip`;
    const outfilestream = fs.createWriteStream(outfile);
    zip.pipe(outfilestream);
    files.forEach((file) => {
      log.debug('adding file to zip');
      try {
        zip.append(fs.createReadStream(file), {
          name: path.basename(file),
        });
      } catch (e) {
        log.error(e);
      }
    });
    let filesadded = 0;
    zip.on('entry', () => {
      /* eslint no-plusplus:0 */
      filesadded++;
      if (filesadded === files.length) {
        // Done processing the files.
        zip.finalize();
        resolve(outfile);
      }
    });

    zip.on('error', (error) => {
      log.error('Zip Failed? ', error);
      reject(error);
    });
      /*
      setTimeout(function() {
        log.debug('Calling finalize'+files[0]);
        zip.finalize()
        log.debug('Called finalize'+files[0]);
        resolve(outfile);
      },500)
      */
  });
}

// Chunk list of files into a smaller lists
function chunkList(list, size) {
  const chunked = [];
  // How many chunks we will have
  const chunks = parseInt(list.length / size, 10) + 1;
  for (let i = 0; i < chunks; i++) {
    // first i is 0;
    chunked.push(list.slice(i * size, (i + 1) * size));
  }
  return chunked;
}

// Zip to 15 files
// eslint-disable-next-line  no-unused-vars
function zipTo15(filelist) {
  // This is the max number of files for face recognition...
  const chunkSize = 15;
  const chunkedList = chunkList(filelist, chunkSize);
  return Promise.all(chunkedList.map(list => zipList(list)));
}

// Resolve the media -- if it is a Youtube video, we have to
// download it and then pass it through VR.
function resolveMedia(metadata) {
// eslint-disable-next-line  no-unused-vars
  return new Promise((resolve, reject) => {
    if (metadata.yt_info) {
      // is youtube
      log.debug('resolveMedia - downloading from youtube');
      tmp.file({
        discardDescriptor: true,
// eslint-disable-next-line  no-unused-vars
      }, (err, tmppath, fd, cleanupCallback) => {
        log.debug('resolveMedia downloading file to tmpfile: ', tmppath);
        ytdl.downloadFromInfo(metadata.yt_info, {
          format: 43,
        })
          .pipe(fs.createWriteStream(tmppath))
          .on('finish', () => {
            log.debug(`ytdownload - downloading from youtube finished: ${tmppath}`);
            resolve(tmppath);
          });
      });
    } else {
      // Make sure we are accessing this from a URL
      // eslint-disable-next-line  no-lonely-if
      if (metadata.content.url.search('http') < 0) {
        resolve(localMediaURL + metadata.content.url);
      } else {
        resolve(metadata.content.url);
      }
    }
  });
}

// Givent a Mediafile, get the screenshots for the times
function getScreenCaps(mediafile, guid, times) {
  const dir = screenshotDir;
  let filenames = null;
  const key = guid;
  // If media isYoutube we have to do something different.
  log.debug('Outputing to: ', dir);
  return new Promise((resolve, reject) => {
    log.debug('visualRecognition: Getting Screen Shots');
    if (times.length === 0) {
      log.debug('visualRecognition: Nothing to do...');
      resolve([]);
    }

    log.debug(`getScreenCaps: ${__dirname}`);
    log.debug(`getScreenCaps: file is: ${mediafile}`);

    ffmpeg(mediafile)
      .on('start', (commandLine) => {
        log.debug(`getScreenCaps: Spawned FFmpeg w/ command: ${commandLine}`);
      })
      .on('codecData', (data) => {
        log.debug(data);
        log.debug(`Input is ${data.audio} audio with ${data.video} video`);
      })
      .on('filenames', (files) => {
        log.debug(`getScreenCaps generated list of files: ${files.length}`);
        filenames = files;
      })
      .on('error', (error) => {
        log.error('getScreenCaps error', error);
        reject(error);
      })
      .on('end', () => {
        log.debug(`getScreenCaps: got ${filenames.length} Screen Shots`);
        resolve(filenames.map(file => `${dir}/${file}`));
      })
      .screenshots({
        timestamps: times,
        folder: dir,
        filename: `__sh-${key}-%s.png`,
        size: '640x360',
      });
  });
}

// Given a file list, VR the whole list.
function vrFilelist(filelist) {
  const finalResults = [];
  return new Promise((resolve, reject) => {
    log.debug(`vrFilelist: Finished Collecting Screen Shots! ${filelist.length}`);
    if (filelist) {
      let errors = 0;
      let classified = 0;
      for (let index = 0; index < filelist.length; index++) {
        combinedVR(filelist[index])
        // eslint-disable-next-line no-loop-func
          .then((res) => {
            finalResults.push(res);
            if (classified === filelist.length - 1) {
              log.debug('vrFilelist:  Resolving promise');
              resolve(finalResults);
            }
            classified++;
            // remove the file when finished
            log.debug(`Finished with file: ${filelist[index]}`);
            deleteFile(filelist[index]);
          })
        // eslint-disable-next-line no-loop-func
          .catch((error) => {
            // If one of the combined VR rejects, ignore it...
            log.error(`A CombinedVR failed: ${classified}/${errors}/${index}`);
            log.error('A CombinedVR failed: ', error);
            // Remove file when finished
            deleteFile(filelist[index]);
            classified++;
            errors++;
            if (classified + errors >= index) {
              log.debug(`vrFileList: resolving promise(classified/errors/total): ${classified}/${errors}/${index}`);
              resolve(finalResults);
            }
            // If everything is an error reject
            if (errors === index) {
              reject(new Error(`vrFileList Failed ${errors} with ${error.msg}`));
            }
          });
      }
    }
  });
}

// Main exposed API -- Given mediametadata, and times, VR it.
function doVisualRecognition(mediaMetadata, times, enrich, vrKey) {
  if (vrKey) {
    vrParams.api_key = vrKey;
  }
  // Init visualRecognition
  visualRecognition = watson.visual_recognition(vrParams);
  return resolveMedia(mediaMetadata)
    .then(media => getScreenCaps(media, mediaMetadata.guid, times))
    //    .then(zipTo15)
    .then(vrFilelist)
    .catch((error) => {
      log.error('visualRecognition got an Error ', error);
    });
}
/*
  // called to enrich text
  enrichText(text, callback) {
    let data = { 'text' :'', 'stt_data': ''};

    if (typeof text === 'string') {
      data.text = text;
    } else if (typeof text === 'object') {
      data = text;
    } else {
      log.debug('Unknown text type for enrichment');
    }
    // Every timer, we do this
    // Save the text to the finalTranscript
  }
*/
module.exports = {
  doVisualRecognition: doVisualRecognition,
  chunkList: chunkList,
  zipList: zipList,
};
