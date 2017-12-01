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
    .controller('EpisodeController', EpisodeController)
    .controller('EpisodeDialogController', EpisodeDialogController);

  EpisodeController.$inject = ['$mdPanel', '$scope', '$log', 'VideoLoaderService', 'VideoEnricherService', 'SocialService'];

  function EpisodeController($mdPanel, $scope, $log, VideoLoaderService, VideoEnricherService, SocialService) {
    var vm = this;
    vm._mdPanel = $mdPanel;
    vm.episode = {};
    // Disable enrichment...
    vm.enrichDisabled=true
    vm.refresh = function() {
      vm.episode = VideoLoaderService.getCurrentEpisode();
    }
    vm.disableParentScroll = true;
    vm.openMenu = function($mdOpenMenu, ev) {
      var originatorEv = ev;
      $mdOpenMenu(ev);
    };

    vm.showDialog = function(id) {
      $log.debug('showDialog: ' + id);
      vm.episode = VideoLoaderService.getEpisodeByGuid(id);
      $log.debug('showDialog: ', vm.episode);
      var position = $mdPanel.newPanelPosition()
        .absolute()
        .center();
      var config = {
        attachTo: angular.element(document.body),
        controller: EpisodeDialogController,
        controllerAs: 'ctrl',
        templateUrl: '/app/views/episode.html',
        hasBackdrop: true,
        panelClass: 'demo-dialog-example',
        position: position,
        trapFocus: true,
        zIndex: 150,
        clickOutsideToClose: true,
        escapeToClose: true,
        focusOnOpen: true,
        locals: {
          'scope': $scope,
          'episode': vm.episode,
          'vls': VideoLoaderService,
          'ss': SocialService
        }
      };
      $mdPanel.open(config);
    };

    vm.showEnrichDialog = function(id) {
      $log.debug('showEnrichDialog: ' + id);
      vm.episode = VideoLoaderService.getEpisodeByGuid(id);
      $log.debug('showDialog: ', vm.episode);
      var position = $mdPanel.newPanelPosition()
        .absolute()
        .center();
      var config = {
        attachTo: angular.element(document.body),
        controller: ReenrichDialogController,
        controllerAs: 'ctrl',
        templateUrl: '/app/views/reenrich.html',
        hasBackdrop: true,
        panelClass: 'demo-dialog-example',
        position: position,
        trapFocus: true,
        zIndex: 150,
        focusOnOpen: true,
        locals: {
          'episode': vm.episode,
          'ves': VideoEnricherService
        }
      };
      $mdPanel.open(config);
    };
  }

  function EpisodeDialogController(mdPanelRef) {
    var vm = this;
    vm.panelRef = mdPanelRef;
    // Shortcut to media metadata
    vm.mm = vm.episode;
    vm.external_sources = {
      'scott': 'hello'
    };
    vm.loadingSocial = false;
    vm.getSocialEnrichment = function() {
      vm.loadingSocial = true;
      if (vm.episode.title === 'Wolf Moon') {
        vm.ss.loadWolfmoonSocial(function(error, result) {
          vm.social = result.context;
          Object.assign(vm.external_sources, result.context.external_sources);
          console.log('!!!!---', vm.external_sources);
          vm.loadingSocial = false;
        });
      } else if (vm.episode.title === 'Lie Ability') {
        vm.ss.loadLieAbilitySocial(function(error, result) {
          console.log('!!!!!!!!!!', result);
          Object.assign(vm.external_sources, result.context.external_sources);
          vm.social = result.context;
          console.log('!!!!---', vm.external_sources);
          vm.loadingSocial = false;
        });
      } else if (vm.episode.title === 'Riddled') {
        vm.ss.loadRiddledSocial(function(error, result) {
          console.log('!!!!!!!!!!', result);
          Object.assign(vm.external_sources, result.context.external_sources);
          vm.social = result.context;
          console.log('!!!!---', vm.external_sources);
          vm.loadingSocial = false;
        });
      }
    }

    vm.getEpisodeEnrichment = function() {
      vm.loadingEnrichment = true;
      vm.vls.getEpisodeEnrichment(vm.episode.guid)
        .then((response) => {
          vm.episode.full_enrichment = response.data.full_enrichment;
          vm.loadingEnrichment = false;
        }).catch((error) => {
          console.error('Failed loading enrichment', error);
        })
    }
    vm.getTitle = function() {
      return vm.episode.series_title + ' | ' + vm.episode.title + ' | Ep. ' + vm.episode.episode_number;
    }
    vm.closeDialog = function() {
      vm.panelRef && vm.panelRef.close().then(function() {
        vm.panelRef.destroy();
      })
    }
  };

  function ReenrichDialogController(mdPanelRef) {
    var vm = this;
    vm.visual_recognition = false;
    vm.logs = [];
    vm.vr_rate = 5;
    vm.vr_api_key = null;
    vm.wks_model = null;
    vm.alchemy_key = null;
    vm.panelRef = mdPanelRef;
    // Shortcut to media metadata
    vm.mm = vm.episode;
    vm.logid = null;
    vm.refreshRate = 3000;

    vm.updateTimer = null;

    vm.updateStatus = function() {
      if (vm.updateTimer) {
        clearTimeout(vm.updateTimer)
      }
      vm.ves.getEnrichmentStatus(vm.logid)
        .then((status) => {
          console.log("STATUS!!!", status);
          if (status.data && status.data.rows) {
            vm.logs = status.data.rows.map((obj) => {
              return obj.doc;
            });
          }
          vm.updateTimer = setTimeout(vm.updateStatus, 3000)
        })
    }

    vm.reenrich = function() {
      vm.ves.reenrich({
          'guid': vm.episode.guid,
          'stt': false,
          'vr': vm.visual_recognition,
          'vr_api_key': vm.vr_api_key,
          'alchemy_key': vm.alchemy_key,
          'wks_model': vm.wks_model,
          'vr_rate': vm.vr_rate
        })
        .then((result) => {
          vm.logid = result.data;
          console.log('VM-log-id --> ', result);
          console.log('VM-log-id --> ', vm.logid);
          vm.updateStatus();
        })
        .catch((error) => {
          console.error(error);
        })
    }

    vm.closeDialog = function() {
      console.log('Closing dialog...');
      clearTimeout(vm.updateTimer);
      vm.panelRef && vm.panelRef.close().then(function() {
        vm.panelRef.destroy();
      })
    }
  };
})();
