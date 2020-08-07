'use strict';
import { getLoggerByFilename, trimString } from '../util/logger';
import WebSocket from 'ws';
import { Player, Event, UUID, FSMWebSocket } from '../types';
import { Logger } from 'log4js';
import { inspect } from 'util';

const log: Logger = getLoggerByFilename(__filename);

export const sendEvent = (websocket: FSMWebSocket, event: Event): void => {
	if (websocket.readyState === WebSocket.OPEN) {
		try {
			websocket.send(JSON.stringify(event));
			log.debug(`Sending event ${trimString(inspect(event))}`);
		} catch (error) {
			log.info(`Failed to send eventId ${event.id} due to websocket.send() error. [error: ${error}]`);
		}
	} else {
		log.info(`Failed to send eventId ${event.id} due to websocket not open.`);
	}
};

export const sendServerEvent = <E extends Event>(player: Player, gameId: UUID, event: E): void => {
	const { websocket, playerId } = player;
	log.info(`Sending server event ${event.type}, playerId ${playerId}, eventId ${event.id} to gameId ${gameId}`);
	sendEvent(websocket, event);
};
