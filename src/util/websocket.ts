'use strict';
import { getLoggerByFilename, trimString } from '../util/logger';
import WebSocket from 'ws';
import { Player, Event, ClientEvent } from '../types';
import { Logger } from 'log4js';
import { inspect } from 'util';

const log: Logger = getLoggerByFilename(__filename);

const sendEvent = (websocket: WebSocket, event: Event): void => {
	if (websocket.readyState === WebSocket.OPEN) {
		try {
			websocket.send(JSON.stringify(event));
		} catch (error) {
			log.info(`Failed to send event ${event.id} due to websocket.send() error. [error: ${error}]`);
		}
	} else {
		log.info(`Failed to send event ${event.id} due to websocket not open ${trimString(inspect(event))}`);
	}
};

export const sendServerEvent = <E extends Event>(player: Player, event: E): void => {
	const { websocket, playerId } = player;
	log.info(`Sending server event ${event.type} to playerId ${playerId} ${trimString(inspect(event))}`);
	sendEvent(websocket, event);
};

export const sendClientEvent = (websocket: WebSocket, event: ClientEvent): void => {
	log.info(`Sending client event ${event.type} ${trimString(inspect(event))}`);
	sendEvent(websocket, event);
};
