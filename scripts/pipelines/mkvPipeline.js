'use strict';

var Promise = require('bluebird');

var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

var _ = require('lodash');
var ffmpeg = require('fluent-ffmpeg');
var matroska = Promise.promisifyAll(require('matroska'));
var mkdirp = Promise.promisify(require('mkdirp'));
var retry = require('bluebird-retry');
var rimraf = require('rimraf');
var streamToPromise = require('stream-to-promise');
var tesseract = Promise.promisifyAll(require('node-tesseract'));
var ytdl = Promise.promisifyAll(require('ytdl-core'));

var config = require('../config');

exports.process = function (url, progressCallback) {
    var timestampPromise = mkdirp(config.temporaryDirectory).then(function () {
        return ytdl.getInfoAsync(url);
    }).then(function(info) {
        var length = info.length_seconds;
        var webmInfo = _.find(info.formats, {
            itag: '247'
        });

        return {
            headerEnd: parseInt(webmInfo.index.split('-')[1], 10),
            size: parseInt(webmInfo.clen, 10),
            length: parseInt(length, 10)
        }
    }).then(function (videoInfo) {
        progressCallback('register', {
            name: 'Downloading video header',
            maxProgress: videoInfo.headerEnd
        });

        var downloadStream = ytdl(url, {
            quality: '247',
            range: '0-' + (videoInfo.headerEnd + 1)
        });

        downloadStream.on('data', function (chunk) {
            progressCallback('progress', chunk.length);
        });

        var stream = fs.createWriteStream(config.headerPath);

        return streamToPromise(downloadStream.pipe(stream));
    }).then(function () {
        var decoder = new matroska.Decoder();

        return decoder.parseAsync(config.headerPath);
    }).then(function (document) {
        var segment = document.getFirstChildByName('Segment');

        var totalSize = segment.getDataSize();

        return segment.getFirstChildByName('Cues')
            .listChildrenByName('CuePoint').map(function (cuePoint) {
                return {
                    time: cuePoint.getFirstChildByName('CueTime').getUInt(),
                    byte: cuePoint.getFirstChildByName('CueTrackPositions')
                        .getFirstChildByName('CueClusterPosition')
                        .getUInt()
                };
            }).map(function (chunk, index, array) {
                var nextChunk = array[index + 1];

                chunk.end = nextChunk ? nextChunk.byte : totalSize;

                return chunk;
            }).filter(function (chunk, index) {
                return index % 2 === 0;
            });
    }).then(function (chunks) {
        progressCallback('register', {
            name: 'Downloading and processing video chunks',
            maxProgress: chunks.length
        });

        return chunks;
    }).map(function (chunk) {
        return retry(function () {
            var PATH = config.temporaryDirectory + '/' + chunk.time + '.webm';
            var OUTPUT = config.temporaryDirectory + '/' + chunk.time + '.png';

            var stream = fs.createWriteStream(PATH);

            fs.createReadStream(config.headerPath).pipe(stream);

            return streamToPromise(stream).then(function () {
                stream = fs.createWriteStream(PATH, {
                    flags: 'a'
                });

                var ytdlStream = ytdl(url, {
                    quality: '247',
                    range: chunk.byte + '-' + chunk.end
                });

                var streamPromise = streamToPromise(ytdlStream);

                ytdlStream.pipe(stream);

                return streamPromise;
            }).then(function () {
                return new Promise(function (resolve, reject) {
                    ffmpeg(PATH)
                        .complexFilter([
                            'crop=in_w:30:0:in_h-30[cropped]',
                            '[cropped]lutrgb=r=negval:g=negval:b=negval[inverted]',
                            '[inverted]scale=4*in_w:4*in_h'
                        ])
                        .on('end', resolve)
                        .on('error', resolve)
                        .output(OUTPUT)
                        .run();
                });
            }).then(function () {
                return tesseract.processAsync(OUTPUT, {
                    psm: 7
                }).then(function (text) {
                    return {
                        timestamp: _.floor(chunk.time / 1000),
                        text: text
                    };
                }).error(function () {});
            });
        }).then(function (data) {
            progressCallback('progress', 1);

            return data;
        });
    }, {
        concurrency: 10
    }).reduce(function (a, b) {
        return a.concat(b);
    }, []).then(function (timestamps) {
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
    itag: '247'
};

exports.name = "WebM/VP9 720p";