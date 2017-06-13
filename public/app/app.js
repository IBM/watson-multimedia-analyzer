(function() {
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
  var app = angular.module('protoApp', [
    'ngRoute',
    'ngMaterial',
    'ngMessages',
    'ngSanitize',
    'com.2fdevs.videogular',
    'com.2fdevs.videogular.plugins.controls',
    'com.2fdevs.videogular.plugins.overlayplay',
    'com.2fdevs.videogular.plugins.buffering',
    'com.2fdevs.videogular.plugins.poster',
    'info.vietnamcode.nampnq.videogular.plugins.youtube',
    'angular.filter'
    ]);

  app.config(function($routeProvider) {
    $routeProvider
    // .when('/splashpage', {
    //     controller: 'SplashPageController',
    //     templateUrl: 'app/views/splashpage.html'
    // })
      .when('/', {
//        controller: 'VideoController',
      //  templateUrl: 'app/views/video.html'
      })
      .when('/episode', {
        controller: 'EpisodeController',
        templateUrl: 'app/views/episode.html'
      })
      .otherwise({
        redirectTo: '/'
      });
  });

  app.directive('myEnter', function() {
    return function(scope, element, attrs) {
      element.bind("keydown keypress", function(event) {
        if (event.which === 13) {
          scope.$apply(function() {
            scope.$eval(attrs.myEnter);
          });

          event.preventDefault();
        }
      });
    };
  });

  app.controller('mainCtrl', function($scope, $rootScope, $log, $timeout, $mdSidenav, $mdPanel) {
    console.log('LOADED');
    $scope.redirect = function(topic, $index) {
      if (topic === 'main') {
        window.location = "#/";
      } else {
        window.location = "#/" + topic;
        console.log(topic + " selected");
        $scope.selectedIndex = $index;
      }
    }
    $scope.formData = {};
    $rootScope.test = $scope.formData.searchText;
    $scope.check = function() {
      var search = $scope.formData.searchText;
      console.log($scope.formData.searchText); //works
      window.location = "#/custom";
    }

    function debounce(func, wait, context) {
      var timer;
      return function debounced() {
        var context = $scope,
          args = Array.prototype.slice.call(arguments);
        $timeout.cancel(timer);
        timer = $timeout(function() {
          timer = undefined;
          func.apply(context, args);
        }, wait || 10);
      };
    }

    function buildDelayedToggler(navID) {
      return debounce(function() {
        $mdSidenav(navID)
          .toggle()
          .then(function() {
            $log.debug("toggle " + navID + " is done");
          });
      }, 200);
    };

      function buildToggler(navID) {
      return function() {
        // Component lookup should always be available since we are not using `ng-if`
        $mdSidenav(navID)
          .toggle()
          .then(function () {
            $log.debug("toggle " + navID + " is done");
          });
      }
    }

    $scope.toggleLeft = buildDelayedToggler('left');

    $scope.toggleRight = buildToggler('right');

    $scope.showDialog = function(episode_id) {
      var position = $mdPanel.newPanelPosition()
        .absolute()
        .center();
      var config = {
        attachTo: angular.element(document.body),
        templateUrl: '/app/views/episode.html',
        hasBackdrop: true,
        panelClass: 'demo-dialog-example',
        position: position,
        trapFocus: true,
        zIndex: 150,
        clickOutsideToClose: true,
        escapeToClose: true,
        focusOnOpen: true
      };

      $mdPanel.open(config);

    };

    $scope.showAbout= function() {
      var position = $mdPanel.newPanelPosition()
        .absolute()
        .center();
      var config = {
        attachTo: angular.element(document.body),
        templateUrl: '/app/views/about.tmpl.html',
        hasBackdrop: true,
        panelClass: 'demo-dialog-example',
        position: position,
        trapFocus: true,
        zIndex: 150,
        clickOutsideToClose: true,
        escapeToClose: true,
        focusOnOpen: true
      };

      $mdPanel.open(config);

    };
  });

  app.config(function($mdThemingProvider) {
    $mdThemingProvider.theme('default')
      .primaryPalette('teal')
  });

  app.config(function($mdThemingProvider) {
    $mdThemingProvider.theme('alt')
      .primaryPalette('indigo')

  });
}());
