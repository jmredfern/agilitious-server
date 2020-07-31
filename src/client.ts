'use strict';

import WebSocket from 'ws';
import { getLoggerByFilename } from './util/logger';
import * as uuid from 'uuid';
import { inspect } from 'util';
import { sendClientEvent } from './util/websocket';
import { getRandomPoints } from './util/points';
import { Logger } from 'log4js';
import {
	UUID,
	ClientEvent,
	UpdatePointsClientEvent,
	OpenIssueClientEvent,
	CloseIssueClientEvent,
	NoChangeClientEvent,
	ConfirmMoveEvent,
	JoinGameClientEvent,
	FSMEvent,
	FSMWebSocket,
} from './types';

const log: Logger = getLoggerByFilename(__filename);

const ERROR_RETRY_TIMEOUT = 5000;

const joinGame = (gameId: UUID, playerId: UUID, websocket: FSMWebSocket): void => {
	const event: JoinGameClientEvent = <JoinGameClientEvent>{
		type: 'JOIN_GAME',
		gameId,
		id: <UUID>uuid.v4(),
		name: 'Test Name',
		playerId,
	};
	sendClientEvent(websocket, event);
};

const getUpdatePointsEvent = (gameId: UUID, playerId: UUID): UpdatePointsClientEvent => ({
	type: 'UPDATE_POINTS',
	playerId,
	points: getRandomPoints(),
	issueId: <UUID>'8c7e35ea-92b8-4976-b5d4-a5b90cb1bc8d',
	gameId,
	id: <UUID>uuid.v4(),
});

const getConfirmMoveEvent = (gameId: UUID, playerId: UUID): ConfirmMoveEvent => ({
	type: 'CONFIRM_MOVE',
	playerId,
	gameId,
	id: <UUID>uuid.v4(),
});

const getNoChangeEvent = (gameId: UUID, playerId: UUID): NoChangeClientEvent => ({
	type: 'NO_CHANGE',
	playerId,
	gameId,
	id: <UUID>uuid.v4(),
});

const getOpenIssueEvent = (gameId: UUID, playerId: UUID): OpenIssueClientEvent => ({
	type: 'OPEN_ISSUE',
	playerId,
	issueId: <UUID>'8c7e35ea-92b8-4976-b5d4-a5b90cb1bc8d',
	gameId,
	id: <UUID>uuid.v4(),
});

const getCloseIssueEvent = (gameId: UUID, playerId: UUID): CloseIssueClientEvent => ({
	type: 'CLOSE_ISSUE',
	playerId,
	issueId: <UUID>'8c7e35ea-92b8-4976-b5d4-a5b90cb1bc8d',
	gameId,
	id: <UUID>uuid.v4(),
});

let nextEvents: Array<ClientEvent>;
let nextEventIndex = 0;

const getNextEvents = (gameId: UUID, playerId: UUID): Array<FSMEvent> => [
	getOpenIssueEvent(gameId, playerId),
	getCloseIssueEvent(gameId, playerId),
	getUpdatePointsEvent(gameId, playerId),
	getConfirmMoveEvent(gameId, playerId),
	getNoChangeEvent(gameId, playerId),
];

const sendNextEvent = (websocket: FSMWebSocket): void => {
	if (nextEventIndex <= nextEvents.length - 1) {
		sendClientEvent(websocket, nextEvents[nextEventIndex++]);
	}
};

const connect = (gameId: UUID, playerId: UUID, websocketUrl: string): void => {
	log.info(`Connecting to ${websocketUrl}`);

	const websocket: FSMWebSocket = <FSMWebSocket>new WebSocket(websocketUrl);

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

export const start = (gameId: UUID = <UUID>uuid.v4(), playerId: UUID = <UUID>uuid.v4(), websocketUrl: string): void => {
	log.info(`Starting client (websocketUrl: ${websocketUrl}, playerId: ${playerId}, gameId: ${gameId})`);
	connect(gameId, playerId, websocketUrl);
};
