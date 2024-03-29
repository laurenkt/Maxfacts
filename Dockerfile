
FROM node:13.10-alpine3.10 AS build_image

ENV HOME=/home/node
ENV NODE_ENV=production

RUN apk add --update --no-cache \
    build-base \
    python \
    git \
    openssh \
    nasm \
    autoconf \
    automake \
    zlib-dev

RUN npm -g install \
    gulp-cli \
    ts-node \
    ts-node-dev \
    typescript

COPY ./build/static $HOME/app/static
COPY package.json $HOME/app
COPY package-lock.json $HOME/app

WORKDIR $HOME/app
RUN npm install --production
COPY . $HOME/app

# ------------

FROM node:13.10-alpine3.10 AS runtime_image

RUN apk add --update --no-cache bash

ENV HOME=/home/node
ENV NODE_ENV=production

COPY --from=build_image $HOME $HOME

RUN chown -R node:node $HOME/app $HOME/.npm
RUN chown -R node:$(id -gn node) /home/node/.config

USER node

WORKDIR $HOME/app

EXPOSE 3000

CMD npm start
