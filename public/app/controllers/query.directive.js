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

  angular
    .module('protoApp')
    .directive('ibmMediaQuery', ibmMediaQuery)

  function msToTime(milliseconds) {
    var t = new Date(1970, 0, 1)
    t.setMilliseconds(milliseconds);
    return t.toTimeString().split(' ')[0];
  }

  var sortByValue = function sortByValue(a, b) {
    if (a.value > b.value) {
      return 1;
    }
    if (a.value < b.value) {
      return -1;
    }
    // a must be equal to b
    return 0;
  };

  function ibmMediaQuery() {
    var directive = {
      link: link,
      templateUrl: 'app/views/query.html',
      controller: QueryController,
      controllerAs: 'vm',
      bindToController: true,
      restrict: 'EA'
    };
    return directive;

    function link(scope, element, attrs) {
      /* */
    }
  }

  var sceneQuery = function sceneQuery(opts) {
    var entities = opts.map((entity) => {
      return {
        "$elemMatch": {
          "type": entity.toUpperCase()
        }
      }
    })

    var query = {
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
    return query

  };


  var momentQuery = function momentQuery(opts) {
    var classes = opts.classes.map((c) => {
      return {
        "$elemMatch": {
          "classes": {
            "$elemMatch": {
              "class": c
            }
          }
        }
      }
    });

    var query = {
      "selector": {
        "type": "moment",
        "visual_recognition.images": {
          "$elemMatch": {
            "classifiers": {
              "$and": classes
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
                    "$gt": opts.anger
                  }
                }
              }, {
                "$elemMatch": {
                  "tone_name": {
                    "$eq": "Fear",
                  },
                  "score": {
                    "$gt": opts.fear
                  }
                }
              }, {
                "$elemMatch": {
                  "tone_name": {
                    "$eq": "Joy",
                  },
                  "score": {
                    "$gt": opts.joy
                  }
                }
              }, {
                "$elemMatch": {
                  "tone_name": {
                    "$eq": "Disgust",
                  },
                  "score": {
                    "$gt": opts.disgust
                  }
                }
              }, {
                "$elemMatch": {
                  "tone_name": {
                    "$eq": "Sadness",
                  },
                  "score": {
                    "$gt": opts.sadness
                  }
                }
              }]
            }
          }
        }
      }, // End of Selector
      "fields": [
        "_id",
        "_rev",
        "time",
      ]
    };
    if (opts.scene) {
      query.selector.scene = opts.scene;
    }

    if (classesOnly(opts)) {
      // Delete the other stuff
      delete query.selector["tone.tone.document_tone.tone_categories"];
    }

    if (classes.length <= 0) {
      delete query.selector["visual_recognition.images"];
    }

    console.log('QUERYING WITH:' + JSON.stringify(query));
    return query;
  };

  function classesOnly(obj) {
    return (obj.anger === 0) &&
      (obj.joy === 0) &&
      (obj.disgust === 0) &&
      (obj.fear === 0) &&
      (obj.sadness === 0)
  }

  function entitiesOnly(obj) {
    return (obj.anger === 0) &&
      (obj.joy === 0) &&
      (obj.disgust === 0) &&
      (obj.fear === 0) &&
      (obj.sadness === 0) &&
      (obj.classes.length === 0)
  }



  QueryController.$inject = ['$rootScope', '$log', 'QueryService'];

  function QueryController($rootScope, $log, QueryService) {
    $log.debug('QueryController initiated');
    var vm = this;
    vm.results = false;
    vm.searching = false;
    vm.searchresults = [];
    vm.searches = [];
    vm.entity_list = [];
    vm.vr_classes = [];
    var default_params = {
      anger: 0,
      joy: 0,
      disgust: 0,
      sadness: 0,
      fear: 0,
      classes: [],
      entities: []
    }
    vm.params = default_params;
    vm.selectedSearch = null;

    function load_entity_list() {
      QueryService.loadCustomEntities(function(error, list) {
        vm.entity_list = list;
        $log.debug('vm_entity_list', vm.entity_list);
      });
      QueryService.loadVRClasses(function(error, list) {
        vm.vr_classes = list.sort((a, b) => {
          if (a.id !== 'default' && b.id === 'default') {
            return -1;
          }
          if (a.id === 'default' && b.id !== 'default') {
            return 1;
          }
          // a must be equal to b
          return 0;
        });
      });
      /*
      QueryService.query({"selector": {"type": "entity_list"},"fields": ["entities"]}, function(list) {
        vm.entity_list = list.data.docs[0].entities;
        $log.debug('vm_entity_list', vm.entity_list);
      })
      */
    }

    vm.loadSearch = function() {
      QueryService.loadSearches(function(error, list){
        $log.debug('Setting search list to ', list);
        vm.searches = list
        vm.params = default_params;
      })
    }

    vm.saveSearch = function() {
      var search = {
        type: 'search',
        name: vm.searchName,
        params: vm.params
      }
      QueryService.saveSearch(search, function(err, response) {
        vm.searchName = null;
        vm.showSaveSearch=false;
      })
    }

    vm.loadMoment = function(id) {
      $log.debug('query.directive.loadMoment: ' + id);
      $rootScope.$broadcast('load-moment', id)
    }

    vm.prettyPrint = function(moment_id) {
      $log.debug('prettyPrint ' + moment_id);
      var s = moment_id.split('_')
      $log.debug('prettyPrint ', s);
      var segment = s[0];
      var s1 = s[s.length - 1].split('-');

      var sceneStartTime = 0;
      var sceneEndTime = 0;
      var momentTime = 0;

      if (s1.length === 3) {
        // We don't have a 'moment'
        sceneStartTime = s1[s1.length - 2];
        sceneEndTime = s1[s1.length - 1];
      } else {
        sceneStartTime = s1[s1.length - 3];
        sceneEndTime = s1[s1.length - 2];
        momentTime = s1[s1.length - 1];
      }
      return `${segment} ${msToTime(sceneStartTime)}-${msToTime(sceneEndTime)} ${momentTime/1000}`
    }

    vm.sceneQuery = function() {
      vm.results = false;
      vm.searching = true;
      var q = sceneQuery(vm.params.entities);
      $log.debug(`sceneAndmomentQuery with params: `, vm.params.entities);
      QueryService.query(q, function(response) {
        response.data.docs.forEach((scene) => {
          $log.debug('converting to pretty print', scene);
          scene.name = vm.prettyPrint(scene._id);
          vm.searchresults.push(scene);
        })
        vm.searching = false;
        vm.results = true;
      });
    }

    vm.onClose = function() {
      vm.params = vm.selectedSearch.params
      $log.debug('Params is now', vm.params);
    }

    vm.sceneAndMomentQuery = function() {
      // Reset searchresults.
      vm.searchresults = [];
      vm.searching = true;
      var p = {};
      Object.assign(p, vm.params);
      var q = sceneQuery(vm.params.entities);
      $log.debug(`sceneAndmomentQuery with params: `, vm.params.entities);
      QueryService.query(q, function(response) {
        //          $log.debug('Query returned' , response);
        // Now we need to go look for moments that match the other params:
        var sceneCount = response.data.docs.length;
        var sceneFinished = 0;
        response.data.docs.forEach((scene) => {
          p.scene = scene._id;
          var mq = momentQuery(p);
          $log.debug('sceneMomentQuery for: ' + p.scene)
          QueryService.query(mq, function(response) {
            $log.debug('sceneMomentQuery for: ', response);
            if (response.data && response.data.docs && response.data.docs.length > 0) {
              $log.debug('Found!!!', response.data);
              response.data.docs.forEach((moment) => {
                  $log.debug('convertying to pretty print', moment);
                  moment.name = vm.prettyPrint(moment._id);
                  vm.searchresults.push(moment);
                })
                //              vm.searchresults.push(scene);
              $log.debug('SerachResults is now !!!', vm.searchresults);
            } else {
              $log.debug('sceneAndMomentQuery: Nothing returned');
            }
            sceneFinished++;
            if (sceneFinished >= sceneCount) {
              vm.searching = false;
            }

          })
        })
      });
      vm.results = true;
    }

    vm.execute = function() {
      // has entities
      if (vm.params.entities.length) {
        // Has only entities (so can only return scenes
        $log.debug('Executing with entities: ', vm.params.entities)
        if (entitiesOnly(vm.params)) {
          return vm.sceneQuery();
        } else {
          return vm.sceneAndMomentQuery();
        }
      }
      vm.searchresults = [];
      var q = momentQuery(vm.params);
      $log.debug(`Query with params: `, vm.params);
      QueryService.query(q, function(response) {
        $log.debug('Query returned', response);
        vm.results = true;

        response.data.docs.forEach((moment) => {
          $log.debug('convertying to pretty print', moment);
          moment.name = vm.prettyPrint(moment._id);
          vm.searchresults.push(moment);
        })
      });
    }

    load_entity_list();
  }
})();
