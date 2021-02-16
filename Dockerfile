FROM node:15.8.0-alpine3.13 AS builder

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build


FROM node:15.8.0-alpine3.13

WORKDIR /home/node
COPY --from=builder build build
COPY --from=builder node_modules node_modules
CMD [ "node", "build/main.js", "poll" ]
