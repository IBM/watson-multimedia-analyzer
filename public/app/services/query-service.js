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
    .factory('QueryService', QueryService);


  function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
  }

  QueryService.$inject = ['$http', '$log'];

  function QueryService($http, $log) {
    // Declare what you are returning
    var ui_data = {
      vr_classes: [],
      custom_entities: []
    };

    var service = {
      query: query,
      ui_data: ui_data,
      loadCustomEntities: loadCustomEntities,
      loadSearches: loadSearches,
      saveSearch: saveSearch,
      loadVRClasses: loadVRClasses
    };

    function loadVRClasses(callback) {
      $http({
        method: 'GET',
        url: '/api/vr_classes',
      }).then(function successCallback(response) {
        // Push these onto media
        $log.debug('Loading Episodes: ', response)
        if (response.data && response.data.rows && response.data.rows.length > 0) {

          var default_classes = response.data.rows.map((item) => {
            return {class: item.key[0], id: item.key[1], count: item.value}
          }).filter((o) => {
            return o.id === 'default';
          });
          var custom_classes = response.data.rows.map((item) => {
            return {class: item.key[0], id: item.key[1], count: item.value}
          }).filter((o) => {
            return o.id !== 'default';
          });

          var new_o = {};
          custom_classes.map((o, index, all) => {
            if (new_o.hasOwnProperty(o.class.toLowerCase())) {
              new_o[o.class.toLowerCase()].id = o.id;
              new_o[o.class.toLowerCase()].count += o.count;
            } else  {
              new_o[o.class.toLowerCase()] = {
                id : o.id,
                count : o.count
              };
            }
          })
         var modified_classes = Object.keys(new_o).map((key) => {
           return {class: capitalizeFirstLetter(key), id: new_o[key].id, count: new_o[key].count};
         })
         callback(null, modified_classes.concat(default_classes));
        }
      }).catch(function errorCallback(error) {
        $log.error('getVrClasses failed: ', error);
        callback(error);
      });
    }

    function loadCustomEntities(callback) {
      $http({
        method: 'GET',
        url: '/api/custom_entities',
      }).then(function successCallback(response) {
        // Push these onto media
        $log.debug('Loading CustomEntities: ', response)
        if (response.data && response.data.rows && response.data.rows.length > 0) {
          callback(null, response.data.rows);
        } else {
          callback(null, []);
        }
      }).catch(function errorCallback(error) {
        $log.error('CustomEntities failed: ', error);
        callback(null);
      });
    }


    function query(queryObj, callback) {
      $log.debug('query-services.query: ', queryObj);

      return $http.post('/api/query', JSON.stringify(queryObj))
        .then(function successCallback(response) {
          // Push these onto media
          $log.debug('query-services.load Complete', response);
          callback(response);
        }).catch(function errorCallback(error) {
          console.error('Init failed: ', error);
        });
    }

    function loadSearches(callback) {
      return $http.get('/api/searches')
        .then(function successCallback(response) {
          // Push these onto media
          $log.debug('query-services.loadSearches Complete', response);
          if (response.data && response.data.rows && response.data.rows.length > 0) {
            // Just return doc
            callback(null, response.data.rows.map((s) => { return s.doc }));
          }
        }).catch(function errorCallback(error) {
          console.error('Init failed: ', error);
          callback(null);
        });
    }

    function saveSearch(searchObj, callback) {
      $log.debug('query-services.saveSearch: ', searchObj);

      return $http.post('/api/save_search', JSON.stringify(searchObj))
        .then(function successCallback(response) {
          // Push these onto media
          $log.debug('query-services.save_search Complete', response);
         callback &&  callback(null, response);
        }).catch(function errorCallback(error) {
          console.error('Init failed: ', error);
        });
    }
    return service;
  }

})();
