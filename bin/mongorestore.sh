/bin/waitforit-linux_amd64 -host mongo -port 27017 -- sleep 1 && \
	mongorestore --drop -h mongo -d maxfacts /data/dump
