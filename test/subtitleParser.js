const SubtitleStream = require('../lib/mediaprocessor/SubtitleStream');
const util = require('util');
const path = require('path');
const fs = require('fs');
const Transform = require('stream').Transform;

// const xml = 'http://media-utils-api.mtvnservices.com/services/InspectMedia/ibm/mtv.com/mgid:file:gsp:alias:/mediabus/mtv.com/2014/04/09/10/28/160696/HDTNW102M1_160696_3572743.dfxp.xml';

const xml = 'http://a19.akadl.mtvnservices.com/44620/mtvnorigin/gsp.alias/mediabus/mtv.com/2014/02/04/12/19/160672/3572730_160672_20140204121957810.dfxp.xml'

const xmlFile = process.argv[2];
const outfile = path.basename(xmlFile) + '.json';
const outStream = fs.createWriteStream(outfile);
const stStream = new SubtitleStream(null, xmlFile);
//const enrichmentStream = new EnrichmentStream(null, 'GAP', false);

class sttParse extends Transform {
  constructor(options) {
    super(options)
  }
  _transform(data, encoding, callback) {
    var obj = JSON.parse(data);
    if (obj.text !== null) {
      console.log('Pushing '+obj.text);
        this.push(obj.text + '\n');
      callback()
    } else {
      callback()
    }
  }
}

stStream.start().pipe(new sttParse()).pipe(outStream);
