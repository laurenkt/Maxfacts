FROM node:8.4-alpine

ENV HOME=/home/node
ENV NODE_ENV=production

# Try to fix weird ENOSPC bug
RUN echo "http://dl-3.alpinelinux.org/alpine/edge/main" >> /etc/apk/repositories
RUN apk add --update --no-cache yarn mongodb-tools
# XXHash dependencies
RUN apk add --update --no-cache build-base python
RUN yarn global add gulp-cli

COPY build $HOME/app
RUN chown -R node:node $HOME/app

USER node
WORKDIR $HOME/app

RUN yarn install

RUN chmod +x bin/docker-start.sh
CMD cd /home/node/app && ./bin/docker-start.sh
