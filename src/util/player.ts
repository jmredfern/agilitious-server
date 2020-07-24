'use strict';

import { getLoggerByFilename } from '../util/logger';
import WebSocket from 'ws';
import { Player, Context, UUID } from '../types';
import { getAvailableAvatarId } from '../services/avatarService';
import { Logger } from 'log4js';

const log: Logger = getLoggerByFilename(__filename);

export const createPlayer = (context: Context, event: any): Player => {
	const { avatarSetId, players } = context;
	const { name, playerId, websocket } = event;
	const avatarId = getAvailableAvatarId(players, <UUID>avatarSetId);
	return { avatarId, name, playerId, websocket };
};

export const getPlayerIndex = (players: Array<Player>, playerId: UUID): number => {
	return players.findIndex(({ playerId: id }) => playerId === id);
};

export const getPlayer = (players: Array<Player>, playerId: UUID): Player => {
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
	activePlayerId: UUID;
	newPlayerId?: UUID;
	players: Array<Player>;
}): UUID => {
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
