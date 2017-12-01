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
.directive('watsonMetadataViewer', watsonMetadataViewer)

    function msToTime(milliseconds) {
      var t = new Date(1970, 0, 1)
      t.setMilliseconds(milliseconds);
      return t.toTimeString().split(' ')[0];
    }

function watsonMetadataViewer() {
  var directive = {
    link: link,
    templateUrl: 'app/views/metadata.html',
    controller: MetadataController,
    scope: {
      moment : '=',
      watsonMetadata: '='
    },
    controllerAs: 'vm',
    bindToController: true,
    restrict: 'EA'
  };
  return directive;

  function link(scope, element, attrs) {
    /* */
    /*
     attrs.$observe('watsonMetadata', function(value){
        console.log('watsonMetadata 4: ', value);

     });
    */
    console.log('watsonMetadataViewer:', scope );
  }
}

  MetadataController.$inject = ['$rootScope', '$log'];
  function MetadataController($rootScope, $log) {
     var vm = this;
     vm.transcriptWordCount = function() {
       var count = 0;
       if (vm.watsonMetadata && vm.watsonMetadata.transcript) {
         count = vm.watsonMetadata.transcript.split(' ').length
       }
       return count;
     }

     vm.gotoMoment = function(moment_time) {
       $rootScope.$broadcast('seek-to-time-and-pause', moment_time);
     }
  }

})();

