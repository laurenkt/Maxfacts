#!/bin/sh

mongorestore -h mongo -d maxfacts backups/$(command ls -t backups | head -1)/maxfacts
npm start
