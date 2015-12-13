'use strict';

var Promise = require('bluebird');

var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

var _ = require('lodash');
var ffmpeg = require('fluent-ffmpeg');
var mkdirp = Promise.promisify(require('mkdirp'));
var rimraf = require('rimraf');
var streamToPromise = require('stream-to-promise');
var tesseract = Promise.promisifyAll(require('node-tesseract'));
var ytdl = Promise.promisifyAll(require('ytdl-core'));

var config = require('../config');

exports.process = function (url, progressCallback) {
    var timestampPromise = mkdirp(config.temporaryDirectory)
        .then(function () {
            return ytdl.getInfoAsync(url);
        }).then(function (info) {
            var videoInfo = _.find(info.formats, {
                itag: '136'
            });

            progressCallback('register', {
                name: 'Downloading video',
                maxProgress: parseInt(videoInfo.clen, 10)
            });

            var downloadStream = ytdl(url, {
                quality: '136'
            });

            downloadStream.on('data', function (chunk) {
                progressCallback('progress', chunk.length);
            });

            var videoStream = fs.createWriteStream(config.videoPath);

            return streamToPromise(downloadStream.pipe(videoStream));
        }).then(function () {
            progressCallback('register', {
                name: 'Generating frames'
            });

            return new Promise(function (resolve, reject) {
                ffmpeg(config.videoPath)
                    .fps(0.1)
                    .complexFilter([
                        'crop=in_w:30:0:in_h-30[cropped]',
                        '[cropped]lutrgb=r=negval:g=negval:b=negval[inverted]',
                        '[inverted]scale=4*in_w:4*in_h'
                    ])
                    .output(config.temporaryDirectory + '/%d0.png')
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });
        }).then(function () {
            var framesPromise = fs.readdirAsync(config.temporaryDirectory).filter(function (file) {
                return path.extname(file) === '.png';
            });

            framesPromise.then(function (frames) {
                progressCallback('register', {
                    name: 'Reading data from frames',
                    maxProgress: frames.length
                });
            });

            return framesPromise.map(function (file) {
                var timestamp = path.basename(file, '.png');
                var filePath = path.join(config.temporaryDirectory, file);

                return tesseract.processAsync(filePath, {
                    psm: 7
                }).then(function (text) {
                    progressCallback('progress', 1);

                    return {
                        timestamp: parseInt(timestamp, 10),
                        text: text
                    };
                });
            }, {
                concurrency: 10
            }).reduce(function (a, b) {
                return a.concat(b);
            }, []);
        })
        .then(function (timestamps) {
            return _.chain(timestamps)
                .filter(function (value) {
                    return value !== undefined;
                })
                .each(function (value) {
                    value.text = value.text.replace(/\n/g, '');
                })
                .sortBy('timestamp')
                .value();
        });

    timestampPromise.then(function () {
        rimraf.sync(config.temporaryDirectory);
    });

    return timestampPromise;
};

exports.requirements = {
    itag: '136'
};

exports.name = "MP4/H.264 720p";