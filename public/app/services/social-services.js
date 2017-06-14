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
    .factory('SocialService', SocialService);


  function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
  }

  SocialService.$inject = ['$http', '$log'];

  function SocialService($http, $log) {
    // Declare what you are returning
    var service = {
      loadWolfmoonSocial: loadWolfmoonSocial,
      loadLieAbilitySocial: loadLieAbilitySocial,
      loadRiddledSocial: loadRiddledSocial
    };

    function loadWolfmoonSocial(callback) {
      $http({
        method: 'GET',
        url: '/api/wolfMoon',
      }).then(function successCallback(response) {
        // Push these onto media
        $log.debug('Loading WolfmoonSocial: ', response)
        if (response.data && response.data ) {
          callback(null, response.data);
        }
      }).catch(function errorCallback(error) {
        $log.error('WolfmoonSocial failed: ', error);
        callback(error);
      });
    }

    function loadLieAbilitySocial(callback) {
      $http({
        method: 'GET',
        url: '/api/lieAbility',
      }).then(function successCallback(response) {
        // Push these onto media
        $log.debug('Loading LieAbilitySocial: ', response)
        if (response.data && response.data ) {
          callback(null, response.data);
        }
      }).catch(function errorCallback(error) {
        $log.error('LieAbilitySocial failed: ', error);
        callback(error);
      });
    }

    function loadRiddledSocial(callback) {
      $http({
        method: 'GET',
        url: '/api/riddled',
      }).then(function successCallback(response) {
        // Push these onto media
        $log.debug('Loading riddledSocial: ', response)
        if (response.data && response.data ) {
          callback(null, response.data);
        }
      }).catch(function errorCallback(error) {
        $log.error('riddledSocial failed: ', error);
        callback(error);
      });
    }
    return service;
  }

})();
