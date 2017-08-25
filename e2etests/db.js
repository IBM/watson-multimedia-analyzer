const expect = require('chai').expect;
const util = require('util');
const db = require('../lib/database');
const fs = require('fs');

describe('dbsave ', function() {
  this.timeout(5000);
  xit('saves', function(done) {
    db.saveDocument('test', {
      'type': 'junk',
      'test': 'This is a test document'
    }, function(err, body) {
      console.log(util.inspect(err, {
        showHidden: false,
        depth: 5
      }));
      expect(err).to.be.null;
      console.log(util.inspect(body, {
        showHidden: false,
        depth: 5
      }));
      done();
    });
    //    fs.writeFile('output.json', JSON.stringify(metadata));
  })

  xit('query', function(done) {
    var d = db.getDB();
    var tone = "Anger";
    var value = 0.0;
    var query = {
      "selector": {
        "type": "moment",
        "visual_recognition.images": {
          "$elemMatch": {
            "classifiers": {
              "$elemMatch": {
                "classes": {
                  "$and": [{
                    "$elemMatch": {
                      "class": {
                        "$eq": "Scott"
                      },
                      "score": {
                        "$gt": 0.7
                      }
                    }
                  }, {
                    "$elemMatch": {
                      "class": {
                        "$eq": "Allison"
                      },
                      "score": {
                        "$gt": 0.7
                      }
                    }
                  }]
                }
              }
            }
          }
        },
        "tone.tone.document_tone.tone_categories": {
          "$elemMatch": {
            "tones": {
              "$and": [{
                "$elemMatch": {
                  "tone_name": {
                    "$eq": "Anger",
                  },
                  "score": {
                    "$gt": 0.7
                  }
                }
              }, {
                "$elemMatch": {
                  "tone_name": {
                    "$eq": "Fear",
                  },
                  "score": {
                    "$gt": 0
                  }
                }
              }, {
                "$elemMatch": {
                  "tone_name": {
                    "$eq": "Joy",
                  },
                  "score": {
                    "$gt": 0
                  }
                }
              }]
            }
          }
        }
      },
      "fields": [
        "_id",
        "_rev"
      ]
    };

    var entities = ["SPORTS"].map((entity) => {
      return {
        "$elemMatch": {
          "type": entity.toUpperCase()
        }
      }
    })

    var query_2 = {
      "selector": {
        "type": "scene",
        "custom_entities": {
          "$and": entities
        }
      }, // End of Selector
      "fields": [
        "_id",
        "_rev",
        "start_time",
        "end_time"
      ]
    };

    db.query(query_2, function(er, result) {
      // console.log("Scene Query", result);
      if (er) {
        throw er;
      }
      result.docs.forEach((scene) => {
        console.log('scene', scene);
        query.selector.scene = scene._id;

        db.query(query, function(er, result) {
          console.log('Moment Query result', result);
          // console.log(result);
          if (result.docs && result.docs.length > 0) {
            console.log('------------ Result --------------');
            console.log(util.inspect(result.docs, {
              color: true,
              showHidden: false,
              depth: 5
            }));
            done();
          }
        })
      })

      /*
      console.log(util.inspect(result, {
        color: true,
        showHidden: false,
        depth: 5
      }));
      */
      expect(er).to.be.null;
    });
    //    fs.writeFile('output.json', JSON.stringify(metadata));
  })
})
