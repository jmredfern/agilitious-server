'use strict';
import logger from '../util/logger';
import WebSocket from 'ws';
import { Logger } from 'log4js';

const log: Logger = logger.getLoggerByFilename(__filename);

export const sendJSObject = (websocket: any, object: any): void => {
	if (websocket.readyState === WebSocket.OPEN) {
		try {
			log.info(`Sending object [type:${object.type}} [playerId:${object.playerId}]}`);
			websocket.send(JSON.stringify(object));
		} catch (error) {
			log.info(`Failed to send object due to websocket.send error. [error: ${error}]`);
		}
	} else {
		log.info(`Failed to send object due to websocket not open. [object: ${object}]`);
	}
};
