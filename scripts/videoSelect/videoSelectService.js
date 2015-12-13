(function (angular) {
    'use strict';

    var Promise = require('bluebird');

    var ytdl = Promise.promisifyAll(require('ytdl-core'));

    angular.module('app').service('videoSelectService', VideoSelectService);

    function VideoSelectService() {
        return {
            getVideoData: getVideoData
        };

        function getVideoData(url) {
            return ytdl.getInfoAsync(url);
        }
    }
})(window.angular);