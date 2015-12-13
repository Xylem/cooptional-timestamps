(function (angular) {
    'use strict';

    var pipelines = require('./scripts/pipelines');

    angular.module('app').service('videoProcessingService', VideoProcessingService);

    function VideoProcessingService() {
        return {
            getBestPipeline: getBestPipeline
        };

        function getBestPipeline(videoDescriptor) {
            return pipelines.getBestPipeline(videoDescriptor);
        }
    }
})(window.angular);