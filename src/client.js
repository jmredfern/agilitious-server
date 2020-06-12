'use strict';

const WebSocket = require('ws');
const logger = require('./logger.js');
const log = logger.getLoggerByFilename({ filename: __filename });
const uuid = require('uuid');
const inspect = require('util').inspect;
inspect.defaultOptions = { depth: 16, compact: false, breakLength: Infinity };

let websocketUrl;

const ERROR_RETRY_TIMEOUT = 5000;

const client = {};

const sendJSObject = (websocket, object) => {
  websocket.send(JSON.stringify(object));
}

const joinGame = websocket => {
  sendJSObject(websocket, {
		type: 'JOIN_GAME',
		gameId: uuid.v4(),
	});
}

const connect = () => {
  log.info(`Connecting to ${websocketUrl}`);

  const websocket = new WebSocket(websocketUrl);
  let connectionErrored = false;

  websocket.on('open', () => {
    log.info('Client connected');
    connectionErrored = false;
    joinGame(websocket);
  });

  websocket.on('message', (eventJSON) => {
    const event = JSON.parse(eventJSON);
    log.info(`Client received: ${inspect(event)}`);
  });

  websocket.on('close', () => {
    log.info('Client disconnected');

    setTimeout(() => {
      connect();
    }, connectionErrored ? ERROR_RETRY_TIMEOUT : 0);
  });
  websocket.on('error', () => {
    connectionErrored = true;
    log.error(`Connection error, retrying in ${ERROR_RETRY_TIMEOUT / 1000} seconds`);
  });
}

client.start = ({ websocketUrl: _websocketUrl }) => {
  websocketUrl = _websocketUrl;
  log.info(`Starting client (websocketUrl: ${websocketUrl})`);
  connect();
};

module.exports = client;
