const util = require('util');

var bySpeakerTimeline = [ { begin: 0, end: 0, text: '' },
  { begin: 77945, end: 79112, text: ' AAH! ' },
  { begin: 79112, end: 80180, text: ' OHH! OHH! ' },
  { begin: 80180,
    end: 82182,
    text: ' STILES, WHAT THE HELL ARE YOU DOING?! ' },
  { begin: 82182,
    end: 85919,
    text: ' YOU WEREN\'T ANSWERING YOUR PHONE. WHY DO YOU HAVE A BAT? ' },
  { begin: 85919,
    end: 87955,
    text: ' I THOUGHT YOU WERE A PREDATOR. ' },
  { begin: 87955,
    end: 97531,
    text: ' A PRE-- [coughs] I--WHA--LOOK, I KNOW IT\'S LATE, BUT YOU GOTTA HEAR THIS. I SAW MY DAD LEAVE 20 MINUTES AGO. DISPATCH CALLED. THEY\'RE BRINGING IN EVERY OFFICER FROM THE BEACON DEPARTMENT, AND EVEN STATE POLICE. ' },
  { begin: 97531, end: 98866, text: ' FOR WHAT? ' },
  { begin: 98866,
    end: 102703,
    text: ' TWO JOGGERS FOUND A BODY IN THE WOODS. ' },
  { begin: 102703, end: 104271, text: ' A DEAD BODY? ' },
  { begin: 104271,
    end: 108241.99999999999,
    text: ' NO, A BODY OF WATER. YES, DUMB-ASS, A DEAD BODY. ' },
  { begin: 108241.99999999999,
    end: 110477,
    text: ' YOU MEAN LIKE MURDERED? ' },
  { begin: 110477,
    end: 113413,
    text: ' NOBODY KNOWS YET. JUST THAT IT WAS A GIRL, PROBABLY IN HER 20s. ' },
  { begin: 113413,
    end: 116250,
    text: ' HOLD ON, IF THEY FOUND THE BODY, THEN WHAT ARE THEY LOOKING FOR? ' },
  { begin: 116250,
    end: 123223,
    text: ' THAT\'S THE BEST PART. THEY ONLY FOUND HALF. WE\'RE GOING. ' } ]

var sentence_tone = [ { sentence_id: 0,
    text: 'agh!   aah!   ohh! ohh!   stiles, what the hell are you doing?!   you weren\'t answering your phone.',
    input_from: 0,
    input_to: 99,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 1,
    text: 'why do you have a bat?   i thought you were a predator.',
    input_from: 100,
    input_to: 155,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 2,
    text: 'a pre-- [coughs] i--wha--look, i know it\'s late, but you gotta hear this.',
    input_from: 156,
    input_to: 229,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 3,
    text: 'i saw my dad leave 20 minutes ago.',
    input_from: 230,
    input_to: 264,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 4,
    text: 'dispatch called.',
    input_from: 265,
    input_to: 281,
    tone_categories: [] },
  { sentence_id: 5,
    text: 'they\'re bringing in every officer from the beacon department, and even state police.',
    input_from: 282,
    input_to: 366,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 6,
    text: 'for what?',
    input_from: 367,
    input_to: 376,
    tone_categories: [] },
  { sentence_id: 7,
    text: 'two joggers found a body in the woods.',
    input_from: 377,
    input_to: 415,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 8,
    text: 'a dead body?',
    input_from: 416,
    input_to: 428,
    tone_categories: [] },
  { sentence_id: 9,
    text: 'no, a body of water.',
    input_from: 429,
    input_to: 449,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 10,
    text: 'yes, dumb-ass, a dead body.',
    input_from: 450,
    input_to: 477,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 11,
    text: 'you mean like murdered?',
    input_from: 478,
    input_to: 501,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 12,
    text: 'nobody knows yet.',
    input_from: 502,
    input_to: 519,
    tone_categories: [] },
  { sentence_id: 13,
    text: 'just that it was a girl, probably in her 20s.',
    input_from: 520,
    input_to: 565,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 14,
    text: 'hold on, if they found the body, then what are they looking for?',
    input_from: 566,
    input_to: 630,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 15,
    text: 'that\'s the best part.',
    input_from: 631,
    input_to: 652,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 16,
    text: 'they only found half.',
    input_from: 653,
    input_to: 674,
    tone_categories: [ [Object], [Object], [Object] ] },
  { sentence_id: 17,
    text: 'we\'re going.',
    input_from: 675,
    input_to: 687,
    tone_categories: [] } ]


function makeToneTimeline(textTimeline, sentence_tones) {
  // take the timeline and search it... 
//  console.log('Making a timeline from:  ', textTimeline);
 // console.log('AND timeline from:  ', sentence_tones);
  // Go through the textTimeline
    var tone_timeline = [];
    // take each sentence tone 
    sentence_tones.forEach(function(sentence) {
      var words = sentence.text(split(/\s+/));
      words.forEach(function(word, index, array) {

      });

    textTimeline.forEach(function(tl) {



  return textTimeline.map(function(tl) {
    tl.tone = sentence_tones.filter(function(tone) {
      // If a TL is IN the sentence, return it... 
      console.log('Searching for length... ', tl.text.length);
      console.log('Searching for ', tl.text);
      if ((tone.text.toLowerCase().search(tl.text.toLowerCase()) > -1)) {
       console.log('Found:  '+ tl.text.toLowerCase() );
       console.log('In:  '+ tone.text );
       return true;
     } else {
       return false
     }
    })
    return tl
  })
}
var tone_moments = makeToneTimeline(bySpeakerTimeline, sentence_tone);
console.log(util.inspect(tone_moments, {color: true, depth: 5}));
