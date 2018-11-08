FROM docker:latest

RUN apk add --update --no-cache \
	automake \
	git \
	alpine-sdk \
	nasm \
	autoconf \
	build-base \
	zlib \
	zlib-dev \
	libpng \
	libpng-dev \
	libwebp \
	libwebp-dev \
	libjpeg-turbo \
	libjpeg-turbo-dev \
	yarn \
	mongodb-tools \
	openssh \
	python

