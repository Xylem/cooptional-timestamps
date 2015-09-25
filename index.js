'use strict';

var Promise = require('bluebird');

var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

var _ = require('lodash');
var ffmpeg = require('fluent-ffmpeg');
var matroska = Promise.promisifyAll(require('matroska'));
var levenshtein = require('fast-levenshtein');
var printf = require('printf');
var retry = require('bluebird-retry');
var rimraf = require('rimraf');
var streamToPromise = require('stream-to-promise');
var tesseract = Promise.promisifyAll(require('node-tesseract'));
var ytdl = Promise.promisifyAll(require('ytdl-core'));

var URL = process.argv[2];
var TEMP_PATH = 'tmp';
var VIDEO_PATH = TEMP_PATH + '/video.mp4';
var HEADER_PATH = TEMP_PATH + '/header.webm';

var TIMESTAMP_OFFSET = -40;

process.on('exit', function () {
    rimraf.sync(TEMP_PATH);
});

fs.mkdirAsync(TEMP_PATH).then(function () {
    return ytdl.getInfoAsync(URL);
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
    console.log('Downloading video header');
    
    var stream = fs.createWriteStream(HEADER_PATH);
    
    return streamToPromise(ytdl(URL, {
        quality: '247',
        range: '0-' + (videoInfo.headerEnd + 1)
    }).pipe(stream));
}).then(function () {
    var decoder = new matroska.Decoder();
    
    return decoder.parseAsync(HEADER_PATH);
}).then(function (document) {
    console.log('Starting downloading/processing');
    
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
        var nextChunkByte = nextChunk ? nextChunk.byte : totalSize;
        
        chunk.end = nextChunkByte;
        
        return chunk;
    }).filter(function (chunk, index) {
        return index % 2 === 0;
    });
}).map(function (chunk) {
    return retry(function () {
        var PATH = TEMP_PATH + '/' + chunk.time + '.webm';
        var OUTPUT = TEMP_PATH + '/' + chunk.time + '.png';

        var stream = fs.createWriteStream(PATH);

        fs.createReadStream(HEADER_PATH).pipe(stream);

        return streamToPromise(stream).then(function () {
            stream = fs.createWriteStream(PATH, {
                flags: 'a'
            });

            var ytdlStream = ytdl(URL, {
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
    });
}, {
    concurrency: 10
}).reduce(function (a, b) {
        return a.concat(b);
}, []).then(function (lines) {
    console.log('Generating timestamp file');
    
    var orderedLines = _.sortBy(lines, 'timestamp');
    
    var lastTopic = '';
    
    var newTopics = [];
    
    var LETTERS = /[a-zA-Z]/g;
    
    orderedLines.filter(function (line) {
        return typeof(line) !== 'undefined';
    }).forEach(function (line) {
        line.text = line.text.replace(/\n/g, '');
        
        if (line.text.length < 3) {
            console.log('Discarding \'' + line.text +'\' at ' + line.timestamp + 's due to length');
            return;
        }
        
        var lettersInLine = line.text.match(LETTERS);
        
        if (!lettersInLine || lettersInLine.length  / line.text.length < 0.7) {
            console.log('Discarding \'' + line.text +'\' at ' + line.timestamp + 's due to insufficient letter content');
            return;
        }
        
        if (levenshtein.get(lastTopic, line.text) > 5) {
            lastTopic = line.text;
            newTopics.push(line);
        }
    })
    
    return newTopics;
}).then(function (topics) {
    var timestampFile = fs.createWriteStream('timestamps.txt');
    
    timestampFile.write('Topic|Timestamp\n');
    timestampFile.write('-|-\n');
    
    topics.forEach(function (topic) {
        var time = topic.timestamp + TIMESTAMP_OFFSET;
        var second = time % 60;
        var minute = ((time - second) % 3600) / 60;
        var hour = (time - second - 60 * minute) / 3600;
        
        timestampFile.write(topic.text + '|[' + printf('%02d:%02d:%02d', hour, minute, second) + '](' + URL + '&t=' + time + ')\n');
    });
    
    timestampFile.end();
});
