(function (angular) {
    'use strict';
    angular.module('app')
        .controller('videoProcessingController', ['$scope', 'videoProcessingService', VideoProcessingController]);

    function VideoProcessingController($scope, videoProcessingService) {
        $scope.videoData.timestamps = null;
        $scope.pipeline = videoProcessingService.getBestPipeline($scope.videoData.descriptors);

        var progress = 0;
        $scope.maxProgress = 0;

        function progressUpdate(type, data) {
            $scope.$apply(function () {
                switch (type) {
                    case 'register':
                        $scope.progressText = data.name;
                        $scope.progressValue = 0;
                        progress = 0;
                        $scope.maxProgress = data.maxProgress;
                        break;
                    case 'progress':
                        progress += data;
                        $scope.progressValue = progress * 100 / $scope.maxProgress;
                        break;
                }
            });
        }

        if ($scope.pipeline) {
            $scope.pipeline.process($scope.videoData.url, progressUpdate).then(function (timestamps) {
                $scope.$apply(function () {
                    $scope.videoData.timestamps = timestamps;
                });
            }).catch(function () {
                $scope.$apply(function () {
                    $scope.videoData.timestamps = null;
                });
            });
        }
    }

})(window.angular);