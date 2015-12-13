(function (angular) {
    'use strict';
    angular.module('app')
        .controller('timestampsFilteringController', ['$scope', 'timestampsFilteringService', TimestampsFilteringController]);

    function TimestampsFilteringController($scope, timestampsFilteringService) {
        $scope.filterSettings = {
            minimalTextLength: 10,
            minimalLetterContent: 70,
            minimalLevenshteinDistance: 9,
            timestampsOffset: 40
        };

        $scope.settingsList = [
            {
                name: 'Minimal text length',
                tooltip: 'Minimal length of the timestamp text for it to be considered valid',
                property: 'minimalTextLength',
                rangeMin: 0,
                rangeMax: 30
            },
            {
                name: 'Minimal letter content',
                tooltip: 'Minimal ratio of letters in timestamp to the entire timestamp text length (removes garbage)',
                property: 'minimalLetterContent',
                rangeMin: 0,
                rangeMax: 100,
                unit: '%'
            },
            {
                name: 'Minimal Levenshtein distance',
                tooltip: 'Minimal level of difference between subsequent timestamps required to detect topic change',
                property: 'minimalLevenshteinDistance',
                rangeMin: 0,
                rangeMax: 30
            },
            {
                name: 'Timestamps offset',
                tooltip: 'Number of seconds to offset timestamps backwards to account for lag between topic indicator updates and actual topic changes',
                property: 'timestampsOffset',
                rangeMin: 0,
                rangeMax: 300,
                unit: 's'
            }
        ];

        $scope.remainingTimestamps = function () {
            var filteredTimestamps = timestampsFilteringService.filterTimestamps($scope.videoData.timestamps,
                $scope.filterSettings);

            $scope.videoData.filteredTimestamps = angular.copy(filteredTimestamps);

            $scope.videoData.filteredTimestamps.forEach(function (timestamp) {
                timestamp.time = timestampsFilteringService.formatAsTime(timestamp.timestamp,
                    $scope.filterSettings.timestampsOffset);
            });

            return filteredTimestamps;
        };

        $scope.formatAsTime = function (timestamp) {
            return timestampsFilteringService.formatAsTime(timestamp, $scope.filterSettings.timestampsOffset);
        };
    }

})(window.angular);