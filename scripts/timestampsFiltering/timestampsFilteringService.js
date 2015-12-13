(function (angular) {
    'use strict';

    var _ = require('lodash');
    var levenshtein = require('fast-levenshtein');
    var printf = require('printf');

    var LETTERS = /[a-zA-Z]/g;

    angular.module('app').service('timestampsFilteringService', TimestampsFilteringService);

    function TimestampsFilteringService() {
        return {
            filterTimestamps: filterTimestamps,
            formatAsTime: formatAsTime
        };

        function filterTimestamps(timestamps, settings) {
            var lastTopic = '';

            return _.chain(timestamps)
                .filter(function (value) {
                    return value.text.length >= settings.minimalTextLength;
                })
                .filter(function (value) {
                    var lettersInLine = value.text.match(LETTERS);

                    return lettersInLine &&
                        lettersInLine.length  / value.text.length >= settings.minimalLetterContent / 100;
                })
                .filter(function (value) {
                    if (levenshtein.get(lastTopic, value.text) > settings.minimalLevenshteinDistance) {
                        lastTopic = value.text;
                        return true;
                    }
                })
                .value();
        }

        function formatAsTime(timestamp, offset) {
            var time = Math.max(0, timestamp - offset);

            var second = time % 60;
            var minute = ((time - second) % 3600) / 60;
            var hour = (time - second - 60 * minute) / 3600;

            return printf('%02d:%02d:%02d', hour, minute, second);
        }
    }
})(window.angular);