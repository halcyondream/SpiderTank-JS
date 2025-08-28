FROM node:current-alpine AS build

WORKDIR /app

COPY src /app/src
COPY index.js /app
COPY package.json /app

RUN npm install --omit=dev

ENTRYPOINT ["node", "/app/index.js"]