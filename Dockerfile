FROM node:15.8.0-alpine3.13 AS builder

WORKDIR /home/node
COPY package.json yarn.lock ./
RUN yarn install --dev --frozen-lockfile
COPY . .
RUN yarn build


FROM node:15.8.0-alpine3.13

WORKDIR /home/node
COPY --from=builder /home/node/build ./build
COPY --from=builder /home/node/node_modules ./node_modules
CMD [ "node", "build/main.js" ]
