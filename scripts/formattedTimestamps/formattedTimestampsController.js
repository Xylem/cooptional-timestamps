(function (angular) {
    'use strict';
    angular.module('app')
        .controller('formattedTimestampsController', ['$scope', 'formattedTimestampsService',
            FormattedTimestampsController]);

    function FormattedTimestampsController($scope, formattedTimestampsService) {
        var listHeader = 'Approximate timestamps to specific topics\n\n&nbsp;\n\nTopic|Timestamp\n-|-\n';
        var listFooter = '\n\n&nbsp;\n\n^^Prepared ^^using ^^https://github.com/Xylem/cooptional-timestamps';

        var timestamps = formattedTimestampsService.format($scope.videoData.filteredTimestamps, $scope.videoData.url);

        $scope.timestampList = listHeader + timestamps + listFooter;
    }

})(window.angular);