'use strict';

import { getLoggerByFilename } from '../util/logger';
import { Player, PlayerStatus, Context, FSMEvent } from '../types';
import { Logger } from 'log4js';
import { isPlayerConnected } from '../util/player';

const log: Logger = getLoggerByFilename(__filename);

export const isPlayersTurn = (context: Context, event: FSMEvent): boolean => {
	const { activePlayerId } = context;
	const result = activePlayerId && activePlayerId === event.playerId;
	if (!result) {
		const { type, id, playerId } = event;
		log.warn(
			`Illegal: move attempted by player out of turn. event: [type: ${type}, id: ${id}], playerId: ${playerId}`,
		);
	}
	return result;
};

export const areOtherPlayersDone = (context: Context, event: FSMEvent): boolean => {
	const { players } = context;
	const { playerId: activePlayerId } = event;
	return players.reduce((result: boolean, player: Player): boolean => {
		const { status, playerId } = player;
		if (playerId === activePlayerId || !isPlayerConnected(player)) {
			return result;
		}
		if (status === PlayerStatus.AwaitingMove) {
			return false;
		}
		return result;
	}, true);
};

export const isOnlyConnectedPlayer = (context: Context, event: FSMEvent): boolean => {
	const { players } = context;
	const { playerId: playerIdToCheckFor } = event;
	return players.reduce((result: boolean, player: Player): boolean => {
		const { playerId } = player;
		if (playerIdToCheckFor === playerId) {
			return result;
		}
		return !isPlayerConnected(player);
	}, true);
};
