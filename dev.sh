#!/usr/bin/env bash

docker-compose down || podman-compose down
docker-compose up -d || podman-compose up -d
node setupdb.js && node_modules/.bin/nodemon
