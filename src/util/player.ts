'use strict';

import WebSocket from 'ws';
import { Player, FSMContext, UUID, PlayerStatus, CreateGameClientEvent, JoinGameClientEvent } from '../types';
import { getAvailableAvatarId } from '../services/avatarService';

export const createPlayer = (context: FSMContext, event: CreateGameClientEvent | JoinGameClientEvent): Player => {
	const { avatarSetId, players } = context;
	const { name, playerId, websocket } = event;
	const avatarId = getAvailableAvatarId(players, avatarSetId);
	const status = PlayerStatus.AwaitingMove;
	const ephemeral = {};
	return { avatarId, name, playerId, websocket, status, ephemeral };
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

export const getNextPlayerId = ({
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
		// We checked all the other players and there's none available to select
		return newPlayer.playerId;
	}
	if (isPlayerConnected(newPlayer)) {
		return newPlayer.playerId;
	} else {
		return getNextPlayerId({ activePlayerId, newPlayerId: newPlayer.playerId, players });
	}
};
