const MetaData = require('../lib/enricher/MetaData');
const sampleData = require('./sample_2.json');

const expect = require('chai').expect;

describe('generate tags', function() {
  const sampleMetaData = new MetaData(sampleData);
  it('listening respond w/ welcome', function() {
    const obj = sampleMetaData.getData();
    expect(obj).to.have.property('tags');
  })

  it('apply {} ', function() {
    sampleMetaData.apply(null);
    const obj = sampleMetaData.getData();
    console.log(obj.tags);
    expect(obj).to.have.property('tags');
  })
})
