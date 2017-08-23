
const db = require('../database');

const episode_guid = process.argv[2];
const fs = require('fs');

let episode = {};


db.getWholeEpisode(episode_guid, (err, response) => {
  episode = response.rows[0].doc;
  db.getEpisodeSegments(episode._id, (err, seg_results) => {
    episode.segments = seg_results.rows.map(s => s.doc);
    episode.segments.forEach((segment) => {
      db.getSegmentScenes(segment._id, (err, scene_results) => {
        segment.scenes = scene_results.rows.map(s => s.doc);
        segment.scenes.forEach((scene) => {
          db.getSceneMoments(scene._id, (err, moment_results) => {
            scene.moments = moment_results.rows.map(s => s.doc);
          });
        });
      });
    });
  });
});
setTimeout(() => {
  fs.writeFile(`${episode_guid}.json`, JSON.stringify(episode), (err) => {
    if (err) {
      console.log('Saving file failed');
    } else {
      console.log(`Saved to file: ${episode_guid}.json`);
    }
  });
}, 3000);
