MaxFacts
========

Building
--------

Project JS is structured across multiple files with embedded HTML and therefore must be compiled before usage.

The simplest way is using `browserify` with Babel:

	browserify -t babelify js/magictriangle.jsx -o main.js
