const request = require('supertest')
const app = require('../app');
describe('POST enrich text', function() {
  it('listening respond w/ welcome', function(done) {
    request(app)
      .post('/login/')
      .auth('enrich', 'enrichit')
      .expect(200)
      .expect(function(res) {
        if (res.text !== 'welcome') {
          throw new Error('Body is not correct: '+ res.text);
        };
      }).end(done);
  })

  it('enrich Text', function(done) {
    this.timeout(5000);
    request(app)
      .post('/api/enrich/')
      .auth('enrich', 'enrichit')
      .send({'text':'test'})
      .expect(200)
      .expect(function(res) {
        const data = res.body;
        if (!data.hasOwnProperty('tags')) {
          throw new Error('Response is incorrect: tags key missing');
        }
      }).end(done);
  })
})
