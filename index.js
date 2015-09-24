'use strict';

var Promise = require('bluebird');

var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

var _ = require('lodash');
var ffmpeg = require('fluent-ffmpeg');
var levenshtein = require('fast-levenshtein');
var printf = require('printf');
var rimraf = require('rimraf');
var streamToPromise = require('stream-to-promise');
var tesseract = Promise.promisifyAll(require('node-tesseract'));
var ytdl = require('ytdl-core');

var URL = process.argv[2];
var TEMP_PATH = 'tmp';
var VIDEO_PATH = TEMP_PATH + '/video.mp4';

process.on('exit', function () {
    rimraf.sync(TEMP_PATH);
});

fs.mkdirAsync(TEMP_PATH).then(function () {    
    console.log('Downloading source video');
    
    var videoStream = fs.createWriteStream(VIDEO_PATH);
    
    ytdl(URL, {
        filter: 'videoonly'
    }).pipe(videoStream);
    
    return streamToPromise(videoStream);
})then(function () {
    console.log('Generating frames');

    return new Promise(function (resolve, reject) {
        ffmpeg(VIDEO_PATH)
        .fps(0.1)
        .complexFilter([
            'crop=in_w:30:0:in_h-30[cropped]',
            '[cropped]lutrgb=r=negval:g=negval:b=negval[inverted]',
            '[inverted]scale=4*in_w:4*in_h'
        ])
        .output(TEMP_PATH + '/%d0.png')
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
}).then(function () {
    console.log('Reading frames')
    
    return fs.readdirAsync(TEMP_PATH).filter(function (file) {    
        return path.extname(file) === '.png';
    }).map(function (file) {        
        var timestamp = path.basename(file, '.png');
        var filePath = path.join(TEMP_PATH, file);
        
        return tesseract.processAsync(filePath, {
            psm: 7
        }).then(function (text) {
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
}).then(function (lines) {
    console.log('Generating timestamp file');
    
    var orderedLines = _.sortBy(lines, 'timestamp');
    
    var lastTopic = '';
    
    var newTopics = [];
    
    orderedLines.forEach(function (line) {
        line.text = line.text.replace(/\n/g, '');
        
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
        var time = topic.timestamp - 10;
        var second = time % 60;
        var minute = ((time - second) % 3600) / 60;
        var hour = (time - second - 60 * minute) / 3600;
        
        timestampFile.write(topic.text + '|[' + printf('%02d:%02d:%02d', hour, minute, second) + '](' + URL + '&t=' + time + ')\n');
    });
    
    timestampFile.end();
});