/bin/wait-for-it.sh mongo:27017 -t 30 -- sleep 1 && \
mongorestore --drop -h mongo -d maxfacts /data/dump
