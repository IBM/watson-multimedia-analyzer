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
.directive('watsonExternalSources', watsonExternalSources)

    function msToTime(milliseconds) {
      var t = new Date(1970, 0, 1)
      t.setMilliseconds(milliseconds);
      return t.toTimeString().split(' ')[0];
    }

function watsonExternalSources() {
  var directive = {
    link: link,
    templateUrl: 'app/views/external_sources.html',
    controller: ExternalSourcesController,
    scope: {
      external: '='
    },
    controllerAs: 'vm',
    bindToController: true,
    restrict: 'EA'
  };
  return directive;

  function link(scope, element, attrs) {
    /* */
    /*
     attrs.$observe('watsonExternalSources', function(value){
        console.log('watsonExternalSources 4: ', value);

     });
    */
  }
}

  ExternalSourcesController.$inject = ['$rootScope', '$log'];
  function ExternalSourcesController($rootScope, $log) {
     var vm = this;
     $log.debug('Social', vm.external);
     vm.transcriptWordCount = function() {
       var count = 0;
       if (vm.watsonExternalSources && vm.watsonExternalSources.transcript) {
         count = vm.watsonExternalSources.transcript.split(' ').length
       }
       return count;
     }
     vm.gotoMoment = function(moment_time) {
       $rootScope.$broadcast('seek-to-time-and-pause', moment_time);
     }
  }

})();

