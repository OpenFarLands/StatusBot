FROM node:20-alpine3.17

ENV BOT_TOKEN=""
ENV STATUS_CHANNEL=""

ENV HOST=""
ENV PORT=""

ENV DISPLAY_HOST=""
ENV DISPLAY_PORT=""

WORKDIR /app
COPY . .

RUN npm install

CMD [ "node", "index.js" ]