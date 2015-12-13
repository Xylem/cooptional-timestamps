(function (angular) {
    'use strict';

    var url = require('url');
    var printf = require('printf');

    angular.module('app').service('formattedTimestampsService', FormattedTimestampsService);

    function FormattedTimestampsService() {
        return {
            format: format
        };

        function format(timestamps, videoUrl) {
            var rawVideoUrl = url.parse(videoUrl, true);

            return timestamps.map(function (timestamp) {
                var timestampUrl = angular.copy(rawVideoUrl);
                timestampUrl.query.t = timestamp.timestamp;
                delete timestampUrl.search;

                return printf('%s|[%s](%s)', timestamp.text, timestamp.time, url.format(timestampUrl));
            }).join('\n');
        }
    }
})(window.angular);