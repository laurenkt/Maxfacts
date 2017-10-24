FROM node:8.4-alpine

ENV HOME=/home/node
ENV NODE_ENV=production

# Try to fix weird ENOSPC bug
# And unsatisfiable constraints
RUN echo "http://dl-1.alpinelinux.org/alpine/latest-stable/main" >> /etc/apk/repositories
RUN echo "http://dl-2.alpinelinux.org/alpine/latest-stable/main" >> /etc/apk/repositories
RUN echo "http://dl-3.alpinelinux.org/alpine/latest-stable/main" >> /etc/apk/repositories
RUN echo "http://dl-4.alpinelinux.org/alpine/latest-stable/main" >> /etc/apk/repositories
RUN echo "http://dl-5.alpinelinux.org/alpine/latest-stable/main" >> /etc/apk/repositories
RUN echo "http://dl-6.alpinelinux.org/alpine/latest-stable/main" >> /etc/apk/repositories

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

CMD cd /home/node/app && ./bin/docker-start.sh
