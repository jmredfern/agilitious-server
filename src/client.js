'use strict';

const WebSocket = require('ws');
const logger = require('./util/logger.js');
const log = logger.getLoggerByFilename({ filename: __filename });
const uuid = require('uuid');
const inspect = require('util').inspect;
const { sendJSObject } = require('./util/websocket');

let websocketUrl;

const ERROR_RETRY_TIMEOUT = 5000;

const client = {};

const joinGame = ({ gameId, websocket }) => {
  sendJSObject(websocket, {
		type: 'JOIN_GAME',
		gameId,
	});
}

const updatePoints = ({ gameId, playerId, websocket }) => {
  sendJSObject(websocket, {
		type: 'UPDATE_POINTS',
		playerId,
		points: 2,
		issueId: '2d47a5df-0bb8-40a6-a4be-de93c0312f77',
		gameId,
	});
}

const connect = () => {
  log.info(`Connecting to ${websocketUrl}`);

  const websocket = new WebSocket(websocketUrl);
  // const gameId = uuid.v4();
  const gameId = '5c747e2c-19dd-4674-9184-4d2cd3a773a3';
  let connectionErrored = false;
  
  websocket.on('open', () => {
    log.info('Client connected');
    connectionErrored = false;
    joinGame({ gameId, websocket });
  });

  websocket.on('message', (eventJSON) => {
    const event = JSON.parse(eventJSON);
    log.info(`Client received: ${inspect(event)}`);
    const playerId = event.gameState.playerId;
    updatePoints({ gameId, playerId, websocket });
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
