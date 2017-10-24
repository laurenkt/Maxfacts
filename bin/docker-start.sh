#!/bin/sh

mongorestore -h mongo -d maxfacts data/dump
yarn install
yarn start
