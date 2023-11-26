#!/usr/bin/env bash

docker-compose down || podman-compose down
docker-compose up -d || podman-compose up -d
npm run dev
