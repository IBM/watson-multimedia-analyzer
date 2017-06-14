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
    .controller('VideoSelectorController', VideoSelectorController);
  VideoSelectorController.$inject = ['$rootScope', '$scope', '$log', 'VideoLoaderService'];
    var sortByDate = function sortByDate(a, b) {
      var c = new Date(a.pubDate);
      var d = new Date(b.pubDate);
      if ( c > d) {
        return 1;
      }

      if (c< d) {
        return -1;
      }
      // a must be equal to b
      return 0;
    };

  function VideoSelectorController($rootScope, $scope, $log, VideoLoaderService) {
    var vm = this;
    vm.seasons = [];
    vm.episodes= [];
    vm.selectedVideo= 0;
    vm.selectedVideoId = '';
    vm.currentSceneId= 0;
    vm.displayingId=0;
    vm.selectedScene = {};
    vm.displayingMoment = {};
    vm.displayingMomentId = 0;
    vm.momentInterval = 5;
    vm.minMomentTime = 0;
    vm.maxMomentTime = 10;
    vm.overview = [];
    vm.segments = [];
    vm.videoMetadata = {};
    /* Select a Video */
    // This loads a video/episode for the Video window
    vm.selectEpisode = function selectEpisode(guid, segment_id, seek_to) {
      var index = VideoLoaderService.getEpisodeIndex(guid);
      $log.debug('selectEpisode -- Firing Episode Select! ', index);
      vm.selectedVideo= 0;
      vm.selectedVideoId = '';
      vm.currentSceneId= 0;
      vm.displayingId=0;
      vm.selectedScene = {};
      vm.displayingMoment = {};
      vm.overview = [];
      vm.segments = [];
      vm.videoMetadata = {};
      vm.selectedSegment = index;
      // Which Video is selected
      vm.selectedVideoId = guid;
      vm.episodeTitle = VideoLoaderService.getEpisodeByGuid(guid).title;
      $log.debug('selectEpisode: Loading! ', vm.selectedVideoId);
      return new Promise((resolve, reject) => {
        VideoLoaderService.load(vm.selectedVideoId, function loadComplete(err, obj) {
          if (err) {
            reject(err);
          }
          $log.debug("selectEpisode: media loaded, setting segment");
          setSegment(segment_id, seek_to);
          $rootScope.$broadcast('video-selected', {index: index, segment: segment_id});
          resolve(vm.selectedVideoId);
        });
      })
    }

    vm.selectSegment = function selectSegment(i, seek_to) {
      return new Promise((resolve, reject) => {
        $log.debug('Firing Segment Select! ',i)
        vm.selectedSegment = i;
        // Which Video is selected
        $rootScope.$broadcast('segment-selected',i);
        setSegment(i, seek_to);
        resolve();
      })
    }

    $scope.$on('load-moment', function(event_object, id) {
      vm.loadMoment(id);
    });

    vm.loadMoment = function loadMoment(id) {
      // get the Moment,
      // select Episode/segment/scene/moment
      VideoLoaderService.loadMoment(id, function(error, obj) {
        $log.debug('Loaded moment: ', obj);
        if (obj.episode._id) {
          // It has an episode & a segment -- load them.
          vm.selectEpisode(obj.episode._id,VideoLoaderService.getIndexByKey(obj.episode.mediaMetadata.segments,'guid', obj.segment._id),obj.scene.start_time);
        } else if (obj.segment.type === 'media') {
          // Then we are the deal load us...
          vm.selectEpisode(obj.segment.guid, 0, obj.scene.start_time)
        } else {
          $log.error('Not sure how to load moment', obj);
        }
      })
    }


    vm.gotoScene = function(scene_time){
      // THis should be in seconds
      $rootScope.$broadcast('seek-to-time', toSeconds(scene_time));
    }

    vm.setMomentByTime= function(moment_time) {
      var moment_index  = vm.moments.findIndex((m) => {
        return m.time === moment_time;
      })
      if (moment_index  >= 0) {
        vm.displayMoment(moment_index);
      } else {
        // do nothing
      }
    }

    vm.displayMoment = function(moment_index) {
      vm.displayingMomentId = moment_index;
      vm.displayingMoment=vm.moments[moment_index];
      vm.displayingMomentTime = vm.displayingMoment.time
    }

    vm.gotoMoment = function(scene_time){
      $rootScope.$broadcast('seek-to-time', toSeconds(scene_time));
    }

    vm.cuePoints = {
      enrichments: []
    };

    vm.displayMetadata = function displayMetadata(i, force) {

      $log.debug('displayMetaData: videoMetadata is: ', vm.videoMetadata);

      if (this.displayingId === i && !force) {
        $log.debug(`displayMetadata: current ${this.displayingId} new: ${i}`);
        $log.debug('Already displaying Metatada');
        return
      }
      $log.debug('displayMetaData: Setting displayingId to:  ' + i);
      // UI Bug, if nothing here, still need to clear out data...
      if (vm.videoMetadata.by_timeline_enrichment && vm.videoMetadata.by_timeline_enrichment.length > 0) {
        this.displayingId = i;
        vm.selectedScene = vm.videoMetadata.by_timeline_enrichment[i];
        VideoLoaderService.moments(vm.selectedScene.guid).then(function(moments) {
          vm.selectedScene.moments = moments;
        });
      }
    }

    function createMomentCuePoints(moments) {
      function momentHandler(currentTime, timeLapse, params) {
          $log.debug(`momentHandler cuePoint onEnter: currentTime: ${currentTime} tl: ${timeLapse.start} - ${timeLapse.end} params.id: ${params.id}`);
          vm.displayingMomentId = params.id;
        }
      $scope.$broadcast('new-moment-cue-points', moments.map((m, index) => {
        return {timeLapse: {
            start: m.time
          },
          params: {
            id: index
          },
          onEnter: momentHandler,
          onUpdate: momentHandler,
          onLeave: momentHandler,
          onComplete: momentHandler,
        }
      }))
    };

    function createSceneCuePoints(timeline) {
      $log.debug('Setting ' + timeline.length + ' cue points');
      var cuePoints = [];
//      vm.cuePoints.length = 0;
      // make sure timeline is sorted:
      var sorted_timeline = timeline.sort(function(a, b) {
        if (a.start_time > b.start_time) {
          return 1;
        }
        if (a.start_time < b.start_time) {
          return -1;
        }
        // a must be equal to b
        return 0;
      });
      // Transform the timeline enrichment to CuePoints
      function sceneHandler(currentTime, timeLapse, params) {
          $log.debug(`sceneHandler cuePoint: currentTime: ${currentTime} tl: ${timeLapse.start} - ${timeLapse.end} params.id: ${params.id}`);
          vm.currentSceneId = params.id;
          vm.displayMetadata(params.id);
        }

      for (var i = 0; i < timeline.length; i++) {
        j: 0
        var cp = {
          params: {},
          timeLapse: {},
        };
        cp.params.id = i;
        // Convert to seconds
        cp.timeLapse.start = toSeconds(timeline[i].start_time)
        // Subtracting 1 to try and give a break in the cuepoint
        cp.timeLapse.end = toSeconds(timeline[i].end_time) -1 ;
        cp.onUpdate = sceneHandler;
        cp.onLeave = sceneHandler;
        cp.onComplete = sceneHandler;
        cp.onEnter = sceneHandler;
        /*
         cp.onUpdate = function(currentTime, timeLapse, params) {
           console.log(`currentTime: ${currentTime} tl: ${timeLapse} params: ${params}`);
           vm.displayMetadata(params.id);
         }
         */
        //$log.debug('setCuePoints: ', cp);
        cuePoints.push(cp);
      }
//      console.log(vm.cuePoints);
      $scope.$broadcast('new-scene-cue-points', cuePoints);
    }

    function toSeconds(t) {
      var s = (t > 1000) ? t/1000 : t;
      return Math.round(s);
    }

    function toTable(arrayOfArrays) {
      var outputString = '';
      arrayOfArrays.forEach((obj) => {
        Object.keys(obj).forEach((key) => {
          outputString += `${key} : ${obj[key]}`;
          /*    if (Array.isArray(obj[key])) {

              }
              */
        })
      });
      return outputString;
    }

    //Set segment is called after we have loaded a new segment.  This sets
    // cuepoints.  We should have a seekTo

    function setSegment(segment_id, seek_to) {
        $log.debug(`setSegment - segment_id ${segment_id} seek_to: ${seek_to}`);
        segment_id = segment_id || 0;
        seek_to = seek_to || 0;
        vm.videoMetadata = VideoLoaderService.loadedSegment;
        $log.debug('Setting Segment to: ', vm.videoMetadata);
        vm.currentSceneId = 0;
        if (vm.videoMetadata.type === 'segment' || vm.videoMetadata.type === 'media') {
          // If we are a segment
          vm.scenes = vm.videoMetadata.by_timeline_enrichment;
          vm.moments = [];
          vm.moments =  VideoLoaderService.data.segment_moments;
          $log.debug('Setting Moments to: ', vm.moments);
          if (vm.moments.length > 0) {
            vm.minMomentTime = vm.moments[0].time;
            vm.maxMomentTime = vm.moments[vm.moments.length-1].time;
            vm.momentInterval = vm.moments[1].time - vm.moments[0].time;
            vm.displayMoment(0);
          }
          $log.debug(vm.scenes);
          createSceneCuePoints(vm.scenes);
          createMomentCuePoints(vm.moments);
          //call this when we are done.
          vm.displayMetadata(segment_id, true);
          if (seek_to > 0) {
            vm.gotoMoment(seek_to);
          }
        } else if (vm.videoMetadata.type === 'episode') {
          vm.segments = vm.videoMetadata.mediaMetadata.segments;
          console.log('======================== segments? ', vm.segments);
          vm.playlist = vm.videoMetadata.mediaMetadata.segments.map((item) => {
            return item.content.url;
          });
          vm.displayMetadata(segment_id, true);
          if (seek_to > 0) {
            vm.gotoMoment(seek_to);
          }
        }
    }

    $scope.$watch(function() {
        return vm.currentSceneId
      },
      function(current, old) {
        if (current !== old) {
          $log.debug('$watch.currentSceneId: Changing from ' + old + ' to ' + current);
          vm.displayMetadata(current);
        }
      });

    // If the loaded media changes...
    $scope.$watch(function() {
      return VideoLoaderService.loadedSegment
    }, function(data, old_data) {
       console.log('loadedMedia Changed !', data);
        console.log('loadedMedia Changed OLD !', old_data);
        if (data._id !== old_data._id) {
          setSegment();
         }

      //        if (vm.videoMetadata.hasOwnProperty('full_enrichment')) {
      //         vm.displayMetadata(-1);
      //      }
    }, true);

    $scope.$watch(function() {
      return vm.displayingMomentId
    }, function(new_moment, old_moment) {
        if (new_moment !== old_moment) {
          vm.displayMoment(new_moment);
         }
    },true);

    $scope.$watch(function() {
      return vm.displayingMomentTime
    }, function(new_moment, old_moment) {
        $log.debug(`DisplayingMomentTime changed to ${new_moment} from ${old_moment}`)
        if (new_moment !== old_moment) {
          vm.setMomentByTime(new_moment);
         }
    },true);

    function reorgEpisodes(episodes) {
      var seasons = {};
      episodes.forEach((episode) => {
        if (!seasons.hasOwnProperty(episode.season_title)) {
          seasons[episode.season_title] = [];
        }
        seasons[episode.season_title].push(episode);
      })
      Object.keys(seasons).forEach((season) => {
        seasons[season].sort(sortByDate)
      })
      return seasons;
    }
        $scope.$watch(function() {
          return VideoLoaderService.data.segment_moments
        }, function(segment_moments) {
          if (segment_moments) {
            $log.debug('Segment_moments changed, resetting '+ segment_moments.length);
             vm.moments = segment_moments;
             if (vm.moments.length > 0) {
               vm.minMomentTime = vm.moments[0].time;
               vm.maxMomentTime = vm.moments[vm.moments.length-1].time;
               vm.momentInterval = vm.moments[1].time - vm.moments[0].time;
               createMomentCuePoints(vm.moments);
               vm.displayMoment(0);
             }
          }
        }, true);

    $scope.$watch(function() {
      return VideoLoaderService.data
    }, function(data) {
      console.log('DATA!', data);
      vm.episodes = data.episodes;
      vm.seasons = reorgEpisodes(data.episodes);
    }, true);
  }
})();
