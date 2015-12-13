(function (angular) {
    'use strict';
    angular.module('app')
        .controller('videoSelectController', ['$scope', 'videoSelectService', VideoSelectController]);

    function VideoSelectController($scope, videoSelectService) {
        $scope.loadVideoData = function () {
            videoSelectService.getVideoData($scope.videoData.url).then(function (data) {
                $scope.$apply(function () {
                    $scope.videoData.descriptors = data;
                });
            }).catch(function () {
                $scope.$apply(function () {
                    $scope.videoData.descriptors = null;
                });
            });
        };
    }

})(window.angular);