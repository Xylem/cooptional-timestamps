(function (angular) {
    'use strict';

    var _ = require('lodash');

    angular.module('app')
        .controller('wizardController', ['$scope', WizardController]);

    function WizardController($scope) {
        $scope.tabs = [
            {
                title: 'Select video',
                content: 'videoSelect',
                provides: [ 'descriptors' ]
            },
            {
                title: 'Video processing',
                content: 'videoProcessing',
                provides: [ 'timestamps' ]
            },
            {
                title: 'Timestamps filtering',
                content: 'timestampsFiltering',
                provides: [ 'filteredTimestamps' ]
            },
            {
                title: 'Formatted timestamps',
                content: 'formattedTimestamps',
                provides: [ ]
            }
        ];

        $scope.videoData = {};

        $scope.tabReady = function (tabIndex) {
            var tab = $scope.tabs[tabIndex];

            return tab && _.every(tab.provides, function (property) {
                    var videoDataProperty = $scope.videoData[property];
                    return videoDataProperty !== null && videoDataProperty !== undefined;
                });
        };

        $scope.nextStep = function () {
            ++$scope.selectedIndex;
        };
    }

})(window.angular);