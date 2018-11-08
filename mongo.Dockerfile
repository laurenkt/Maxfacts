FROM alpine:3.6

RUN apk add --update --no-cache mongodb-tools

COPY data/dump /data/dump
COPY bin /bin

RUN chmod +x /bin/mongorestore.sh /bin/waitforit-linux_amd64

CMD /bin/mongorestore.sh
	
