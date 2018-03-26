FROM node:8.4-alpine

ENV HOME=/home/node
ENV NODE_ENV=production

# Dependencies for yarn, mongorestore, and xxhash
RUN apk add --update --no-cache yarn mongodb-tools build-base python

# Get gulp
RUN yarn global add gulp-cli

COPY build $HOME/app
RUN chown -R node:node $HOME/app

USER node
WORKDIR $HOME/app

RUN yarn install

RUN chmod +x bin/docker-start.sh

EXPOSE 3000

CMD yarn start
