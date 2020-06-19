'use strict';

import WebSocket from 'ws';
import logger from './util/logger';
import * as uuid from 'uuid';
import { inspect } from 'util';
import { sendJSObject } from './util/websocket';
import { getRandomPoints } from './util/points';
import { Logger } from 'log4js';

const log: Logger = logger.getLoggerByFilename({ filename: __filename });

const ERROR_RETRY_TIMEOUT: number = 5000;

const joinGame = ({ gameId, playerId, websocket }: { gameId: string, playerId: string, websocket: any }): void => {
  const event = {
		type: 'JOIN_GAME',
    gameId,
    id: uuid.v4(),
    name: 'Test Name',
    playerId,
  };
  sendJSObject(websocket, event);
}

const getUpdatePointsEvent = ({ gameId, playerId }: { gameId: string, playerId: string }): any => ({
  type: 'UPDATE_POINTS',
  playerId,
  points: getRandomPoints(),
  issueId: '8c7e35ea-92b8-4976-b5d4-a5b90cb1bc8d',
  gameId,
  id: uuid.v4(),
});

const getConfirmMoveEvent = ({ gameId, playerId }: { gameId: string, playerId: string }): any => ({
  type: 'CONFIRM_MOVE',
  playerId,
  gameId,
  id: uuid.v4(),
});

const getNoChangeEvent = ({ gameId, playerId }: { gameId: string, playerId: string }): any => ({
  type: 'NO_CHANGE',
  playerId,
  gameId,
  id: uuid.v4(),
});

const getOpenIssueEvent = ({ gameId, playerId }: { gameId: string, playerId: string }): any => ({
  type: 'OPEN_ISSUE',
  playerId,
  issueId: '8c7e35ea-92b8-4976-b5d4-a5b90cb1bc8d',
  gameId,
  id: uuid.v4(),
});

const getCloseIssueEvent = ({ gameId, playerId }: { gameId: string, playerId: string }): any => ({
  type: 'CLOSE_ISSUE',
  playerId,
  issueId: '8c7e35ea-92b8-4976-b5d4-a5b90cb1bc8d',
  gameId,
  id: uuid.v4(),
});

let nextEvents: Array<any>;
let nextEventIndex: number = 0;

const getNextEvents = ({ gameId, playerId }: { gameId: string, playerId: string }): any => ([
  getOpenIssueEvent({ gameId, playerId }),
  getCloseIssueEvent({ gameId, playerId }),
  getUpdatePointsEvent({ gameId, playerId }), 
  getConfirmMoveEvent({ gameId, playerId }),
  getNoChangeEvent({ gameId, playerId }),  
]);

const sendNextEvent = (websocket: any): void => {
  if (nextEventIndex <= nextEvents.length - 1) {
    sendJSObject(websocket, nextEvents[nextEventIndex++]);
  }
};

const connect = ({ gameId, playerId, websocketUrl }: { gameId: string, playerId: string, websocketUrl: string }): void => {
  log.info(`Connecting to ${websocketUrl}`);

  const websocket = new WebSocket(websocketUrl);

  let connectionErrored = false;

  websocket.on('open', (): void => {
    log.info('Client connected');
    connectionErrored = false;
    nextEvents = getNextEvents({ gameId, playerId });
    joinGame({ gameId, playerId, websocket });
  });

  websocket.on('message', (eventJSON: string) => {
    const event = JSON.parse(eventJSON);
    log.info(`Client received: ${inspect(event)}`);
    if (playerId !== '6fb1d710-38ca-4eb1-a9c8-ef0e4138696a') {
      return;
    }
    setTimeout(() => {
      sendNextEvent(websocket);
    }, 5000); 
  });

  websocket.on('close', (): void => {
    log.info('Client disconnected');

    setTimeout((): void => {
      connect({ gameId, playerId, websocketUrl });
    }, connectionErrored ? ERROR_RETRY_TIMEOUT : 0);
  });
  websocket.on('error', (): void => {
    connectionErrored = true;
    log.error(`Connection error, retrying in ${ERROR_RETRY_TIMEOUT / 1000} seconds`);
  });
}

export const start = ({ gameId = uuid.v4(), playerId = uuid.v4(), websocketUrl }: { gameId: string, playerId: string, websocketUrl: string }) => {
  log.info(`Starting client (websocketUrl: ${websocketUrl}, playerId: ${playerId}, gameId: ${gameId})`);
  connect({ gameId, playerId, websocketUrl });
};
