const vr = require('../lib/mediaprocessor/VisualRecognition');
const util = require('util');
const ytdl = require('ytdl-core');

const watson=require('watson-developer-cloud');
const fs = require('fs');

//const mediaLink = 'http://media-utils-api.mtvnservices.com/services/InspectMedia/ibm/mtv.com/mgid:file:gsp:alias:/mediabus/mtv.com/2014/04/09/10/28/160695/HDTNW102A7_160695_3572743_1280x720_3500_h32.mp4'

const mediaLink ='http://media-utils-api.mtvnservices.com/services/InspectMedia/ibm/mtv.com/mgid:file:gsp:alias:/mediabus/mtv.com/2014/04/09/10/28/160690/HDTNW102A2_160690_3572743_1280x720_3500_h32.mp4'
var yt_media = 'https://www.youtube.com/watch?v=T7qNjIZp9Zs';

const xml = 'http://media-utils-api.mtvnservices.com/services/InspectMedia/ibm/mtv.com/mgid:file:gsp:alias:/mediabus/mtv.com/2014/04/09/10/28/160696/HDTNW102M1_160696_3572743.dfxp.xml';

const times = [20,30,40,50,60,70,80];



/*
var visual_recognition = watson.visual_recognition({
    api_key: 'c98a505b45a77ff70eb1ab3002d6c2531b089e47',
    version: 'v3',
    version_date: '2016-05-20'
});
    var params = {};
    try {
      params.images_file = fs.createReadStream('./screenshots/__sh-500.png');
    } catch(e) {
      console.error(e)
      return
    }
    console.log('calling visual_recognition classify')
    visual_recognition.classify(params, function(err, res) {
      console.log('visual_recognition classify returned', err);
      if (err) {
        console.log('classifyVR:',  err);
      } else {
        res.images.forEach((img) => {
          img.time = getTimeStamp(img.image);
        })
        console.log('classifyVR: finished', res);
      }
    });

*/

ytdl.getInfo(yt_media, (err, info) => {
  vr.visualRecognition({yt_info: info}, times)
    .then((results) =>  {
      console.log('Finished');
      console.log(util.inspect(results, {color: true, depth: null}))
    }).catch((error) => { console.error(error)});
})
