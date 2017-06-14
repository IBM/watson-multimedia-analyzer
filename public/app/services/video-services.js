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
      //.factory('VideoDataService', VideoDataService)
      //.factory('VideoEnricherService', VideoEnricherService)
      .filter('videoMetadata', videoMetadataFilter)
      .factory('VideoLoaderService', VideoLoaderService);
    var sortByStartTime = function sortByStartTime(a, b) {

      if (a.start_time > b.start_time) {
        return 1;
      }
      if (a.start_time < b.start_time) {
        return -1;
      }
      // a must be equal to b
      return 0;
    };

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

    var sortByTime = function sortByTime(a, b) {
      if (a.time > b.time) {
        return 1;
      }
      if (a.time < b.time) {
        return -1;
      }
      // a must be equal to b
      return 0;
    };


    var updateArray = function updateArray(a, newvalue) {
      // a should be a reference to an array... Clear it and assign new value
      // set to 0
      a.splice(0,a.length)

      newvalue.reduce((prev, curr) => {
        prev.push(curr);
        return prev;
      }, a)
    }


    function msToTime(timeToConvert, milliseconds) {
      var t = new Date(1970, 0, 1)
      // We need to check othertime if it is defined here.  if either are >1000 we Should
      // do milliseconds.  There is a case if the first is very small we don't pick correctly
      // Whole Millisecond thing is messed up and needs to be fixed throughout.

      if (milliseconds) {
       t.setMilliseconds(timeToConvert);
      } else {
       t.setMilliseconds(timeToConvert*1000);
      }
      return t.toTimeString().split(' ')[0];
    }

    // findIndex Polyfil

    function findIndex(list, key, id) {
       var length = list.length >>> 0;
       var value;
       for (var i = 0; i < length; i++) {
          value = list[i];
           if (value[key] === id) {
             return i;
           }
       }
      return -1;
   }

    VideoLoaderService.$inject = ['$rootScope', '$http', '$log'];

    function VideoLoaderService($rootScope, $http, $log) {
      var data = {
        // A list of episodes (highest level construct)
        episodes: [],
        // Segments of SELECTED episode
        //   These are individually playable
        segments: [],
        // Scenes of selected segment
        scenes: [],
        // moments of selected scene
        moments: [],
        segment_moments: [],
        custom_entities: [],
        vr_classes: []
      };

      var selected = {
        // A list of episodes (highest level construct)
        episode: 0,
        // Segments of SELECTED episode
        //   These are individually playable
        segment: 0,
        // Scenes of selected segment
        scene: 0,
        // moments of selected scene
        moment: 0
      };

      var loadedSegment = {};
      var segment = '';
      // Declare what you are returning
      var service = {
        segment: segment,
        selected: selected,
        data: data,
        loadedSegment: loadedSegment,
        start: start,
        moments: moments,
        load: load,
        loadMoment: loadMoment,
        momentsBySegment:momentsBySegment,
        getVideos: getVideos,
        getEpisodeIndex: getEpisodeIndex,
        getCurrentEpisode: getCurrentEpisode,
        getEpisodeEnrichment: getEpisodeEnrichment,
        getEpisode: getEpisode,
        getEpisodeByGuid: getEpisodeByGuid,
        getIndexByKey: getIndexByKey
      };

      function getSegmentIndex(id) {
        return getIndex(data.segments, id);
      }

      function getEpisodeIndex(id) {
        return getIndex(data.episodes, id)
      }

      function getIndex(array, id) {
        return findIndex(array,'guid',id);
      }

      function getIndexByKey(array, key, id) {
        $log.debug('getIndexByKey: Looking in Array: ', array)
        return findIndex(array, key, id);
      }

      function getEpisodeByGuid(guid) {
        return data.episodes[getEpisodeIndex(guid)]
      }

      function getEpisode(id) {
        return data.episodes[id]
      }

      function getEpisodeEnrichment(guid) {
        // Replace guid ':' w/ 3 underscores..
        var query_id = guid.replace(/:/g, '___');
        return $http({
          method: 'GET',
          url: '/api/episode/'+query_id,
        })
      }

      function getCurrentEpisode() {
        return data.episodes[selected.episode]
      }

      // Generic lookup of an ID
      function load(id, callback) {
        $log.debug('video-services.load: ' + id);
        $http({
          method: 'GET',
          url: '/api/media/' + id,
        }).then(function successCallback(response) {
            // Push these onto media
            $log.debug('video-services.load Complete', response);
            if (response.data.type === 'episode') {
              // Mark episode selected, set Segment selected to 0;
              selected.episode = getIndex(data.episodes, id);
              selected.segment = 0;
              selected.scene = 0;
              selected.moment = 0;
              loadSegment(response.data, callback);
              // segemtns and 'media' are the same thing
            } else if (response.data.type === 'segment' || response.data.type === 'media') {
              // should have scenes, lets load them
              var segment_id = response.data.guid;
              scenes(segment_id)
                .then(function success(scenestoadd) {
                  $log.debug('video-services.load adding scenes ', scenestoadd);
                  response.data.by_timeline_enrichment = scenestoadd;
                  loadSegment(response.data, callback);
                  return momentsBySegment(response.data.guid)
                })
                .then(function loadMoments(moments) {
                  $log.debug('video-services.load adding moments', moments);
                  updateArray(service.data.segment_moments, moments);
              }).catch(function fail(error) {
                loadSegment(response.data, callback)
              })

           /*  THis does not work because the episode_id contains ':'
            } else if (response.data.type === 'episode') {
              // should have segments, lets load them
              segments(response.data._id).then(function success(segmentstoadd) {
                $log.debug('video-services.load adding segments', segmentstoadd);
                response.mediaMetadata.segments = segmentstoadd;
                loadSegment(response.data, callback);
              }).catch(function fail(error) {
                loadSegment(response.data, callback)
              })
              */
            } else {
              loadSegment(response.data, callback)
            }
        }).catch(function errorCallback(error) {
        console.error('Init failed: ', error);
      });
    }

    function scenes(id) {
      $log.debug('video-services.scenes ', id);
      return new Promise(function(resolve, reject) {
        $http({
          method: 'GET',
          url: '/api/scenes/' + id,
        }).then(function(response) {
          $log.debug('video-services.scenes finished ', response);

          var useMilliseconds = response.data.rows.filter( function(s) {
            return (s.doc.start_time > 1000 || s.doc.end_time > 1000)
          }).length === response.data.rows.length;
          // If all of them are > 1000, use milliseconds.
          resolve(response.data.rows.map(function(scene) {
            scene.doc.name = msToTime(scene.doc.start_time, useMilliseconds);
            // Not already Ms... Convert them
            if (!useMilliseconds) {
              scene.doc.start_time = scene.doc.start_time*1000;
              scene.doc.end_time = scene.doc.end_time*1000;
            }
            return scene.doc;
          }).sort(sortByStartTime));
        }).catch(function(error) {
          reject(error);
        })
      })
    }

    function segments(episode_id) {
      $log.debug('load-segments Called...' + episode_id);
      return new Promise(function(resolve, reject) {
        $http({
          method: 'GET',
          url: '/api/segments/' + episode_id,
        }).then(function(response) {
          resolve(response.data.rows.map(function(segment) {

            return segment.doc;
          }).sort(sortByStartTime));
        }).catch(function(error) {
          reject(error);
        })
      })

    }

    function momentsBySegment(segment_id) {
      $log.debug('load-moments-by-segment Called...' + segment_id);
      return new Promise(function(resolve, reject) {
        $http({
          method: 'GET',
          url: '/api/segment_moments/' + segment_id,
        }).then(function(response) {
          resolve(response.data.rows.map(function(moment) {
            return moment.doc;
          }).sort(sortByTime));
        }).catch(function(error) {
          reject(error);
        })
      })
    }

    function moments(scene_id) {
      $log.debug('load-moments Called...' + scene_id);
      return new Promise(function(resolve, reject) {
        $http({
          method: 'GET',
          url: '/api/moments/' + scene_id,
        }).then(function(response) {
          resolve(response.data.rows.map(function(moment) {
            return moment.doc;
          }).sort(sortByTime));
        }).catch(function(error) {
          reject(error);
        })
      })
    }

    function loadSegment(metadata, callback) {
      $log.debug('video-services.loadSegment called on ', metadata);
      segment = metadata._id;
      $rootScope.$evalAsync(function() {
        Object.assign(loadedSegment, metadata);
        /*
        mediaObject.rows.forEach(function(item){
          media =media.push(mediaObject.rows);
        })
        */
        callback && callback();
      });
    }

    function loadMoment(id, callback) {
      $log.debug('video-services.loadMoment: ' + id);
      var obj = {
        moment: {},
        scene: {},
        segment: {},
        episode: {}
      }
      $http({
        method: 'GET',
        url: '/api/media/' + id,
      }).then(function successCallback(response) {
        if (response.data && response.data.type === 'moment') {
          $log.debug('moment: ', response);
          if (response.data && response.data.scene) {
             obj.moment = response.data;
            return $http({
              method: 'GET',
              url: '/api/media/' + response.data.scene,
            })
          }
        } else {
            return new Promise((resolve, reject) => {
              resolve(response);
            })
        }
      }).then(function successCallback(response) {
        $log.debug('scene: ', response);
        if (response.data && response.data.segment) {
           obj.scene = response.data;
          return $http({
            method: 'GET',
            url: '/api/media/' + response.data.segment,
          })
        }
      }).then(function successCallback(response) {
        $log.debug('segment: ', response);
        if (response.data) {
          obj.segment = response.data;
          if (response.data.episode) {
          $log.debug('Found segment and it has an episode tag...', response.data);
            return $http({
              method: 'GET',
              url: '/api/media/' + response.data.episode,
            })
          }
        }
      }).then(function successCallback(response) {
        $log.debug('episode: ', response);
        if (response && response.data) {
          obj.episode = response.data;
        }
        callback && callback(null, obj);
      }).catch(function error(error) {
        $log.error(error);
        callback && callback(error);
      })
    }

    // Episode is a master object that is selected(like an Episode, it could have segments)
    function updateEpisodes(mediaObject) {
      if (mediaObject) {
        $rootScope.$evalAsync(function() {
        $log.debug('updateEpisodes: ', mediaObject);
          data.episodes = mediaObject.rows.map((o) => {
            if (o.key.length === 2) {
              return o.key[1];
            } else {
              return o.key
            }
          }).sort(sortByDate);
          /*
          mediaObject.rows.forEach(function(item){
            media =media.push(mediaObject.rows);
          })
          */
          $log.debug('updateEpisode: media is now', data.episodes)
        })
      }
    }

    /**
     * @param {string} url
     */
    function start(url) {
      // Going to just harcode this right now.
      $log.debug('Starting up and loading episodes');
      $http({
        method: 'GET',
        url: '/api/episodes',
      }).then(function successCallback(response) {
        // Push these onto media
        $log.debug('Loading Episodes: ', response)
        updateEpisodes(response.data);
      }).catch(function errorCallback(error) {
        $log.error('Init failed: ', error);
      });
    };

    function getVideos() {
      return data.episodes;
    };

    start();
    return service;
  }

  function VideoDataService() {};

  function VideoEnricherService() {};

  videoMetadataFilter.$inject = ['$filter'];
  function videoMetadataFilter($filter) {
    function prettyPrintMetadata(value, filterName) {
      return $filter(filterName)(value);
    }
    return prettyPrintMetadata;
  }

})();
