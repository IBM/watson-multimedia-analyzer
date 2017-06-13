(function() {
  'use strict';
  /*
   * Copyright 2016 IBM Corp. All Rights Reserved.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  angular.module('protoApp')
    .controller('VideoController', VideoController);

  VideoController.$inject = ['$scope', '$log', '$sce', '$timeout', 'VideoLoaderService'];

  function VideoController($scope, $log, $sce, $timeout, VideoLoaderService) {
    console.log('Instantiating a VIDEOCONTROLLER');
    var controller = this;
    controller.state = null;
    controller.API = null;
    controller.playlist = [];
    controller.onPlayerReady = function(API) {
      console.log('Player is READY!  API?', API);
      controller.API = API;
    };

    $scope.$on('video-selected', function(event_object, index_obj) {
      console.log('Got event video-selected', index_obj);
      controller.setVideo(index_obj);
    });

    $scope.$on('segment-selected', function(event_object, index) {
      console.log('Got event segment-selected');
      controller.playFromPlaylist(index);
    });

    $scope.$on('new-scene-cue-points', function(event_object, cuePoints) {
      console.log('Got new-cue-points to apply', cuePoints);
      controller.config.cuePoints.scenes= cuePoints;
    });

    $scope.$on('new-moment-cue-points', function(event_object, cuePoints) {
      console.log('Got new-moment-cue-points to apply', cuePoints);
      controller.config.cuePoints.moments= cuePoints;
    });

    $scope.$on('seek-to-time', function(event_object, time) {
      console.log('Seeking to: '+time + ' Seconds');
      controller.API.seekTime(time);
      // Not going to pause when seeking, unless it is a Moment.
//      controller.API.pause();
 //     console.log('Should be paused');
    });

    $scope.$on('seek-to-time-and-pause', function(event_object, time) {
      console.log('Seeking to (and Pausing): '+time);
      controller.API.seekTime((time>1000? time/1000 : time));
      // Not going to pause when seeking, unless it is a Moment.
      controller.API.pause();
     console.log('Should be paused');
    });

    controller.playFromPlaylist = function(index) {
     controller.now_playing = index;
     //console.log("CONTROLLER controller API", controller.API);
      //console.log(controller);
      controller.API && controller.API.stop();
      VideoLoaderService.load(controller.playlist[index].guid);
      controller.config.sources = [controller.playlist[index]];
      console.log('Playing... ', controller.playlist[index]);
      console.log('Source is:  ', controller.config.sources);
      $timeout(() => {
        console.log('Calling PLAY!  ', controller);
        controller.API.play.call(controller.API)}, 1000);
    }

    controller.onCompleteVideo = function() {
      controller.isCompleted = true;
      controller.now_playing++;
      if (controller.now_playing >= controller.playlist.length) controller.now_playing = 0;
      controller.playFromPlaylist(controller.now_playing);
    }

    function makeFakeCuePoints() {
      var cps = [];
      var cp = {
        timeLapse: {
          start: null,
        },
        onUpdate: function cpOnUpdate() {
          console.log('Updated!')
        },
        onLeave: function cpOnLeave() {
          console.log('Left!')
        },
        onEnter: function cpOnEnter() {
          console.log('Entered!')
        },
        onComplete: function cpOnComplete() {
          console.log('Complete!')
        },
        params : {
          message: "Cue Point Entered!"
        }
      };

      return [10,20,30].map((i) => {
        var C = {};
        Object.assign(C, cp);
        C.timeLapse.start=i;
        return C;
      })
    }

    controller.config = {
      preload: "none",
      autoHide: false,
      autoHideTime: 3000,
      autoPlay: false,
      audio: false,
      sources: [],
      cuePoints: {
        scenes: [],
        moments: []
      },
      theme: "bower_components/videogular-themes-default/videogular.css",
      plugins: {
     //   poster: "http://www.videogular.com/assets/images/videogular.png"
      }
    };

    controller.setVideo = function(options) {
      var index = 0;
      var segment_id = 0;
      if (typeof options === 'object') {
        if (typeof options.index !== 'undefined') {
           index = options.index;
        }
        if (typeof options.segment !== 'undefined') {
           segment_id= options.segment;
        }
      } else if (typeof options !== 'undefined') {
        // assume its anumber:
        index = options;
      }
      var media = VideoLoaderService.getVideos();
      $log.debug('setVideo media', media);
      $log.debug('setVideo - index', index);
      $log.debug('setVideo - segment_index', segment_id);
      var video = media[index];
      $log.debug('setVideo video', video);
      controller.playlist = [];
      if (video) {
//        controller.API && controller.API.stop();
        if (video.segments ) {
          video.segments.forEach(function(segment) {
            console.log('SEGMENT? ', segment);
            //controller.playlist.push({ src: $sce.trustAsResourceUrl(segment.content.url), type: "video/mp4"});
            // Extending the src object with a guid...
            if (segment.content.format_name  && segment.content.format_name === 'wav') {
              controller.config.audio=true;
              controller.playlist.push({ guid: segment.guid, src: segment.content.url, type: "audio/wav"});
            } else {
              controller.playlist.push({ guid: segment.guid, src: segment.content.url, type: "video/mp4"});
            }
          });
        } else {
          controller.playlist.push({
            src: video.content.url,
            guid: video.guid,
            type: 'video/mp4' });
        }
        $log.debug('setVideo PLAYLIST: ', controller.playlist);
        controller.now_playing = segment_id;
        controller.playFromPlaylist(segment_id);
      }
    }
  }
})();
