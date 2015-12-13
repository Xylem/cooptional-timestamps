'use strict';

var _ = require('lodash');

var PIPELINES = [
    require('./pipelines/mkvPipeline'),
    require('./pipelines/mp4Pipeline')
];

exports.getBestPipeline = function (videoDescriptor) {
    return _.find(PIPELINES, function (pipeline) {
        return _.find(videoDescriptor.formats, pipeline.requirements);
    });
};