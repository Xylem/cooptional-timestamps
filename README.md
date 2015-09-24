cooptional-timestamps
=====================

A small node.js utility to generate a table for Reddit with timestamps to specific topics in Co-optional Podcast episodes (based on the text at the bottom of the video updated by TB).

Prerequisites
=============

* [ffmpeg](https://www.ffmpeg.org/)
* [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)

You need both those utilites to be installed on your system and have [PATH](https://en.wikipedia.org/wiki/PATH_(variable)) variable configured with them.

Usage
=====

```
node index https://www.youtube.com/watch?v=<videoID>
```

Using short links (`youtu.be`) will also work, but the generated timestamp links will be broken.

License
=======

MIT