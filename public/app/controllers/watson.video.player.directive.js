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
    .directive('watsonVideoPlayer', watsonVideoPlayer)

  function msToTime(milliseconds) {
    var t = new Date(1970, 0, 1)
    t.setMilliseconds(milliseconds);
    return t.toTimeString().split(' ')[0];
  }

  function watsonVideoPlayer() {
    var directive = {
      link: link,
      controller: 'VideoController',
      templateUrl: 'app/views/watson-video-player.html',
      scope: {
        episodeTitle: '=',
      },
      restrict: 'EA',
      controllerAs: 'ctrl'
    };
    return directive;

    function link(scope, element, attrs) {
      /* */
      /*
       attrs.$observe('watsonMetadata', function(value){
          console.log('watsonMetadata 4: ', value);

       });
      */
      console.log('watsonMetadataViewer:', scope);
    }
  }
})();
