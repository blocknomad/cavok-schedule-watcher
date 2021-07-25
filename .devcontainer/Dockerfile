FROM buildkite/puppeteer

RUN apt-get update \
    && apt-get install -y git

WORKDIR ..

RUN npm install -g heroku
RUN npm install
