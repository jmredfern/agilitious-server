'use strict';

import logger from '../util/logger';
import WebSocket from 'ws';
import { Player } from '../types';
import { Logger } from 'log4js';

const log: Logger = logger.getLoggerByFilename(__filename);

export const getPlayerIndex = (players: Array<Player>, playerId: string) => {
	return players.findIndex(({ playerId: id }) => playerId === id);
};

export const getPlayer = (players: Array<Player>, playerId: string): Player => {
	const playerIndex = players.findIndex(({ playerId: id }) => playerId === id);
	return players[playerIndex];
};

export const isPlayerConnected = (player: Player): boolean => {
	const { websocket } = player;
	return websocket.readyState === WebSocket.OPEN; // possible options are CONNECTING, OPEN, CLOSING or CLOSED
};

export const getNewActivePlayerId = ({
	activePlayerId,
	newPlayerId,
	players,
}: {
	activePlayerId: string;
	newPlayerId?: string;
	players: Array<Player>;
}): string => {
	const playerIndex = getPlayerIndex(players, newPlayerId || activePlayerId);
	let newPlayer;
	if (playerIndex === players.length - 1) {
		newPlayer = players[0];
	} else {
		newPlayer = players[playerIndex + 1];
	}
	if (newPlayer.playerId === activePlayerId) {
		log.info('No new active player found');
		return activePlayerId;
	}
	if (isPlayerConnected(newPlayer)) {
		return newPlayer.playerId;
	} else {
		return getNewActivePlayerId({ activePlayerId, newPlayerId: newPlayer.playerId, players });
	}
};
