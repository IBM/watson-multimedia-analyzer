const db = require('../database');

const episodeGuid = process.argv[2];
const fs = require('fs');

let episode = {};

/* This walks through and gets all all of the content for a single
 * episode and writes it to a JSON file.
 *  CLI Only  at the moment
 */

db.getWholeEpisode(episodeGuid, (err, response) => {
  episode = response.rows[0].doc;
  // Get the segments that are part of episode
  db.getEpisodeSegments(episode._id, (err2, segResults) => {
    // add the segments
    episode.segments = segResults.rows.map(s => s.doc);
    episode.segments.forEach((segment) => {
      // add the scenes
      /* eslint  no-param-reassign: 0 */
      db.getSegmentScenes(segment._id, (err3, sceneResults) => {
        segment.scenes = sceneResults.rows.map(s => s.doc);
        segment.scenes.forEach((scene) => {
          db.getSceneMoments(scene._id, (err4, momentResults) => {
            scene.moments = momentResults.rows.map(s => s.doc);
          });
        });
      });
    });
  });
});

setTimeout(() => {
  fs.writeFile(`${episodeGuid}.json`, JSON.stringify(episode), (err) => {
    if (err) {
      console.log('Saving file failed');
    } else {
      console.log(`Saved to file: ${episodeGuid}.json`);
    }
  });
}, 3000);
