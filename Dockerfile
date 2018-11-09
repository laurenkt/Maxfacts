FROM node:10.9-alpine

ENV HOME=/home/node
ENV NODE_ENV=production

RUN apk add --update --no-cache mongodb-tools build-base python git openssh \
    nasm autoconf automake zlib-dev

RUN npm -g install gulp-cli ts-node ts-node-dev typescript

COPY . $HOME/app
COPY ./build/static $HOME/app/static
RUN chown -R node:node $HOME/app $HOME/.npm
RUN chown -R node:$(id -gn node) /home/node/.config

USER node
WORKDIR $HOME/app

RUN npm install
RUN cp -R node_modules /tmp/node_modules

EXPOSE 3000

CMD npm start
