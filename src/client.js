'use strict';

const WebSocket = require('ws');
const logger = require('./util/logger.js');
const log = logger.getLoggerByFilename({ filename: __filename });
const uuid = require('uuid');
const inspect = require('util').inspect;
const { sendJSObject } = require('./util/websocket');
const { getRandomPoints } = require('./util/points');
const { getRandomIntInclusive } = require('./util/math');

const ERROR_RETRY_TIMEOUT = 5000;

const client = {};

const joinGame = ({ gameId, playerId, websocket }) => {
  const event = {
		type: 'JOIN_GAME',
    gameId,
    id: uuid.v4(),
  };
  if (playerId) {
    event.playerId = playerId;
  }
  sendJSObject(websocket, event);
}

const getUpdatePointsEvent = ({ gameId, playerId }) => ({
  type: 'UPDATE_POINTS',
  playerId,
  points: getRandomPoints(),
  issueId: '2d47a5df-0bb8-40a6-a4be-de93c0312f77',
  gameId,
  id: uuid.v4(),
});

const getConfirmMoveEvent = ({ gameId, playerId }) => ({
  type: 'CONFIRM_MOVE',
  playerId,
  gameId,
  id: uuid.v4(),
});

const getNoChangeEvent = ({ gameId, playerId }) => ({
  type: 'NO_CHANGE',
  playerId,
  gameId,
  id: uuid.v4(),
});

const getOpenIssueEvent = ({ gameId, playerId }) => ({
  type: 'OPEN_ISSUE',
  playerId,
  issueId: '2d47a5df-0bb8-40a6-a4be-de93c0312f77',
  gameId,
  id: uuid.v4(),
});

const getCloseIssueEvent = ({ gameId, playerId }) => ({
  type: 'CLOSE_ISSUE',
  playerId,
  issueId: '2d47a5df-0bb8-40a6-a4be-de93c0312f77',
  gameId,
  id: uuid.v4(),
});

let nextEvents;
let nextEventIndex = 0;

const getNextEvents = ({ gameId, playerId }) => ([
  getOpenIssueEvent({ gameId, playerId }),
  getCloseIssueEvent({ gameId, playerId }),
  getUpdatePointsEvent({ gameId, playerId }), 
  getConfirmMoveEvent({ gameId, playerId }),
  getNoChangeEvent({ gameId, playerId }),  
]);

const sendNextEvent = websocket => {
  if (nextEventIndex <= nextEvents.length - 1) {
    sendJSObject(websocket, nextEvents[nextEventIndex++]);
  }
};

const connect = ({ gameId, playerId, websocketUrl }) => {
  log.info(`Connecting to ${websocketUrl}`);

  const websocket = new WebSocket(websocketUrl);

  let connectionErrored = false;

  websocket.on('open', () => {
    log.info('Client connected');
    connectionErrored = false;
    nextEvents = getNextEvents({ gameId, playerId });
    joinGame({ gameId, playerId, websocket });
  });

  websocket.on('message', (eventJSON) => {
    const event = JSON.parse(eventJSON);
    log.info(`Client received: ${inspect(event)}`);
    if (playerId !== '6fb1d710-38ca-4eb1-a9c8-ef0e4138696a') {
      return;
    }
    setTimeout(() => {
      sendNextEvent(websocket);
    }, 5000); 
    // setTimeout(() => {
    //   sendNextEvent(websocket);
    // }, getRandomIntInclusive(10000,20000)); 
    // setTimeout(() => {
    //   updatePoints({ gameId, playerId, websocket });
    // }, getRandomIntInclusive(5000,15000)); 
  });

  websocket.on('close', () => {
    log.info('Client disconnected');

    setTimeout(() => {
      connect({ gameId, playerId, websocketUrl });
    }, connectionErrored ? ERROR_RETRY_TIMEOUT : 0);
  });
  websocket.on('error', () => {
    connectionErrored = true;
    log.error(`Connection error, retrying in ${ERROR_RETRY_TIMEOUT / 1000} seconds`);
  });
}

client.start = ({ gameId = uuid.v4(), playerId = uuid.v4(), websocketUrl }) => {
  log.info(`Starting client (websocketUrl: ${websocketUrl}, playerId: ${playerId}, gameId: ${gameId})`);
  connect({ gameId, playerId, websocketUrl });
};

module.exports = client;
