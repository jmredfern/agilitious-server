'use strict';

const WebSocket = require('ws');
const logger = require('./util/logger.js');
const log = logger.getLoggerByFilename({ filename: __filename });
const uuid = require('uuid');
const inspect = require('util').inspect;
const { sendJSObject } = require('./util/websocket');
const { getRandomPoints } = require('./util/points');
const { getRandomIntInclusive } = require('./util/math');

let websocketUrl;

const ERROR_RETRY_TIMEOUT = 5000;

const client = {};

const joinGame = ({ gameId, playerId, websocket }) => {
  const event = {
		type: 'JOIN_GAME',
		gameId,
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
});

const getOpenIssueEvent = ({ gameId, playerId }) => ({
  type: 'OPEN_ISSUE',
  playerId,
  issueId: '2d47a5df-0bb8-40a6-a4be-de93c0312f77',
  gameId,
});

const getCloseIssueEvent = ({ gameId, playerId }) => ({
  type: 'CLOSE_ISSUE',
  playerId,
  issueId: '2d47a5df-0bb8-40a6-a4be-de93c0312f77',
  gameId,
});

let nextEvents;
let nextEventIndex = 0;

const getNextEvents = ({ gameId, playerId }) => ([
  getUpdatePointsEvent({ gameId, playerId }),
  getOpenIssueEvent({ gameId, playerId }),
  getCloseIssueEvent({ gameId, playerId }),  
]);

const sendNextEvent = websocket => {
  if (nextEventIndex <= nextEvents.length - 1) {
    sendJSObject(websocket, nextEvents[nextEventIndex++]);
  }
};

const connect = () => {
  log.info(`Connecting to ${websocketUrl}`);

  const websocket = new WebSocket(websocketUrl);
  // const gameId = uuid.v4();
  const gameId = '5c747e2c-19dd-4674-9184-4d2cd3a773a3';
  const playerId = uuid.v4();
  // const playerId = '7bf233fe-cb73-4e32-827f-b004abed1f18';
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
