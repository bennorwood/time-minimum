FROM node:lts-alpine

RUN mkdir /.bin
WORKDIR /.bin

COPY . .

LABEL maintainer="Ben Norwood <ben.norwood821@gmail.com>" \
      version="0.1"

COPY min-time-difference.js min-time-difference.js
RUN chmod +x min-time-difference.js

CMD /.bin/min-time-difference.js
