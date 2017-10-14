#!/bin/sh

mongorestore -h mongo -d maxfacts data/dump/maxfacts
npm start
