'use strict';

import WebSocket from 'ws';
import { getLoggerByFilename } from './util/logger';
import { v4 as uuidv4 } from 'uuid';
import { inspect } from 'util';
import { sendJSObject } from './util/websocket';
import { getRandomPoints } from './util/points';
import { Logger } from 'log4js';

const log: Logger = getLoggerByFilename(__filename);

const ERROR_RETRY_TIMEOUT = 5000;

const joinGame = (gameId: string, playerId: string, websocket: any): void => {
	const event = {
		type: 'JOIN_GAME',
		gameId,
		id: uuidv4(),
		name: 'Test Name',
		playerId,
	};
	sendJSObject(websocket, event);
};

const getUpdatePointsEvent = (gameId: string, playerId: string): any => ({
	type: 'UPDATE_POINTS',
	playerId,
	points: getRandomPoints(),
	issueId: '8c7e35ea-92b8-4976-b5d4-a5b90cb1bc8d',
	gameId,
	id: uuidv4(),
});

const getConfirmMoveEvent = (gameId: string, playerId: string): any => ({
	type: 'CONFIRM_MOVE',
	playerId,
	gameId,
	id: uuidv4(),
});

const getNoChangeEvent = (gameId: string, playerId: string): any => ({
	type: 'NO_CHANGE',
	playerId,
	gameId,
	id: uuidv4(),
});

const getOpenIssueEvent = (gameId: string, playerId: string): any => ({
	type: 'OPEN_ISSUE',
	playerId,
	issueId: '8c7e35ea-92b8-4976-b5d4-a5b90cb1bc8d',
	gameId,
	id: uuidv4(),
});

const getCloseIssueEvent = (gameId: string, playerId: string): any => ({
	type: 'CLOSE_ISSUE',
	playerId,
	issueId: '8c7e35ea-92b8-4976-b5d4-a5b90cb1bc8d',
	gameId,
	id: uuidv4(),
});

let nextEvents: Array<any>;
let nextEventIndex = 0;

const getNextEvents = (gameId: string, playerId: string): any => [
	getOpenIssueEvent(gameId, playerId),
	getCloseIssueEvent(gameId, playerId),
	getUpdatePointsEvent(gameId, playerId),
	getConfirmMoveEvent(gameId, playerId),
	getNoChangeEvent(gameId, playerId),
];

const sendNextEvent = (websocket: any): void => {
	if (nextEventIndex <= nextEvents.length - 1) {
		sendJSObject(websocket, nextEvents[nextEventIndex++]);
	}
};

const connect = (gameId: string, playerId: string, websocketUrl: string): void => {
	log.info(`Connecting to ${websocketUrl}`);

	const websocket = new WebSocket(websocketUrl);

	let connectionErrored = false;

	websocket.on('open', (): void => {
		log.info('Client connected');
		connectionErrored = false;
		nextEvents = getNextEvents(gameId, playerId);
		joinGame(gameId, playerId, websocket);
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

		setTimeout(
			(): void => {
				connect(gameId, playerId, websocketUrl);
			},
			connectionErrored ? ERROR_RETRY_TIMEOUT : 0,
		);
	});
	websocket.on('error', (): void => {
		connectionErrored = true;
		log.error(`Connection error, retrying in ${ERROR_RETRY_TIMEOUT / 1000} seconds`);
	});
};

export const start = (gameId: string = uuidv4(), playerId: string = uuidv4(), websocketUrl: string) => {
	log.info(`Starting client (websocketUrl: ${websocketUrl}, playerId: ${playerId}, gameId: ${gameId})`);
	connect(gameId, playerId, websocketUrl);
};
