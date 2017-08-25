const vr = require('../lib/mediaprocessor/VisualRecognition');
const expect = require('chai').expect;
const util = require('util');
// Text to enrich
//

describe('vr', function() {
  it('chunkList', function() {
    var l = 78;
    var  list = [];
    for(var i=0;i<l; i++) {
      list.push(i);
    }
    var b = vr.chunkList(list, 15);
    console.log(b);
    expect(b.length).to.equal(parseInt(l/15)+1);
  });

  // I could not get this to work.  For a future feature
  xit('zipfile', function(done) {
    var list = [ '../screenshots/__sh-v3wOwtVyC6_6228133_1071990_20160223212745047_1280x720_3500_h32.mp4-70.png',
    '../screenshots/__sh-v3wOwtVyC6_6228133_1071990_20160223212745047_1280x720_3500_h32.mp4-75.png',
    '../screenshots/__sh-v3wOwtVyC6_6228133_1071990_20160223212745047_1280x720_3500_h32.mp4-80.png',
    '../screenshots/__sh-v3wOwtVyC6_6228133_1071990_20160223212745047_1280x720_3500_h32.mp4-85.png',
    '../screenshots/__sh-v3wOwtVyC6_6228133_1071990_20160223212745047_1280x720_3500_h32.mp4-90.png',
    '../screenshots/__sh-wXldqzStGk_6192618_1023303_20160209223553459_1280x720_3500_h32.mp4-0.png',
    '../screenshots/__sh-yzkLOPX5Iv_6207517_1045425_20160217241632115_1280x720_3500_h32.mp4-0.png',
    '../screenshots/__sh-yzkLOPX5Iv_6207517_1045425_20160217241632115_1280x720_3500_h32.mp4-10.png',
    '../screenshots/__sh-yzkLOPX5Iv_6207517_1045425_20160217241632115_1280x720_3500_h32.mp4-15.png',
    '../screenshots/__sh-yzkLOPX5Iv_6207517_1045425_20160217241632115_1280x720_3500_h32.mp4-20.png',
    '../screenshots/__sh-yzkLOPX5Iv_6207517_1045425_20160217241632115_1280x720_3500_h32.mp4-25.png',
    '../screenshots/__sh-yzkLOPX5Iv_6207517_1045425_20160217241632115_1280x720_3500_h32.mp4-30.png',
    '../screenshots/__sh-yzkLOPX5Iv_6207517_1045425_20160217241632115_1280x720_3500_h32.mp4-5.png']
    vr.zipList(list)
      .then((filename)=> {
      console.log('ZipList to file: '+filename)
        done();
    })
  });
})
