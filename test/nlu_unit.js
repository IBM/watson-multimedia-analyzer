const nlu = require('../lib/enricher/NLU');
const expect = require('chai').expect;
const util = require('util');
// Text to enrich
//
var text = 'hey, that\'s the spirit. everyone should have a dream, even a pathetically unrealistic one.   just out of curiosity, which half of the body are we looking for?   huh! i didn\'t even think about that.   and, uh, what if whoever killed the body is still out here?   also something i didn\'t think about.   uhh! [breathless] it\'s...comforting to know you\'ve planned this out with your usual attention to detail.   i know.   maybe the severe asthmatic should be the one holding the flashlight, huh? [wheezing]  \n wait, come on!   stiles! [gasps] wait up! stiles!  \nstiles![dog barking]   hold it right there!   hang on, hang on. this little delinquent belongs to me. [dog barking]   dad, how are you doing?   so, do you, uh, listen in to all of my phone calls?   no, heh. not the boring ones.   now, where\'s your usual partner in crime?   who, scott? sc-scott\'s home. he said he wanted to get a good night\'s sleep for first day back at school tomorrow. it\'s just me. in the woods. alone.   [shouts] scott, you out there? [distant thunder] scott? [sighs] well, young man, i\'m gonna walk you back to your car. and you and i are gonna have a conversation about something called invasion of privacy.';

describe('nlu', function() {
  it('NLU Entities', function(done) {
    this.timeout(10000);
    var text2 =  'Hello, this is Stiles, he is best friends with Scott.'
    nlu.nluEntities(text).then(function(result) {
      console.log('Result!', result);
      done()
    }).catch(function(error) {
      console.log('Error', error);
    })
  });
  xit('Typed Relations', function(done) {
    this.timeout(10000);
    var text2 =  'Hello, this is Stiles, he is best friends with Scott.'
    nlu.nluTypedRelations(text).then(function(result) {
      console.log('Result!', result);
      done()
    }).catch(function(error) {
      console.log('Error', error);
    })
  });
  xit('Combined Query', function(done) {
    this.timeout(10000);
    var text2 =  'Hello, this is Stiles, he is best friends with Scott.'
    nlu.nluQuery(text).then(function(result) {
      console.log(util.inspect(result, {color:true, depth:null}));
      done()
    }).catch(function(error) {
      console.log('Error', error);
    })
  })
})
