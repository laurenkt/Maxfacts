#!/bin/sh

mongorestore -h mongo -d maxfacts data/dump/maxfacts
yarn install
yarn start
