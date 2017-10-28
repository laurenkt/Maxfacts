#!/bin/sh

# Restore from Backup
mongorestore --drop -h mongo -d maxfacts data/dump
# Install dependencies
yarn install
# Start server
yarn start
