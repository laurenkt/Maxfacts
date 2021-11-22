FROM arm64v8/alpine:3.14

RUN apk add --update --no-cache mongodb-tools bash

COPY data/dump /data/dump
COPY bin /bin

RUN chmod +x /bin/*

CMD /bin/mongorestore.sh
