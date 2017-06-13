const xmlToMeta = require('../lib/mediaprocessor/XMLToMeta');
const expect = require('chai').expect;

const util = require('util');
const fs = require('fs');

const XMLSingleSample1 = 'resources/viacom_1.xml';
const XMLSample1 = 'resources/viacom.xml';
const XMLSample3 = '../feeds/bzumxb.xml';
const XMLSample2 = 'resources/cnn.xml';

describe('XMLToMeta ', function() {
  this.timeout(5000);
  var xmlFile = '';
  it('loads', function() {
    xmlFile = fs.readFileSync(XMLSample3, 'utf8');
    var metadata = xmlToMeta(xmlFile);
//    console.log(util.inspect(metadata, {showHidden: false, depth :2 }));
//    fs.writeFile('output.json', JSON.stringify(metadata));
    expect(metadata).to.be.an.Array
  })
})
