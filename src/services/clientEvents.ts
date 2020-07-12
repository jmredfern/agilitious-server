'use strict';

import { sendJSObject } from '../util/websocket';
import { getPlayerIndex, isPlayerConnected } from '../util/player';
import { Context, Issue, Player } from '../types';

const getPlayersState = (players: Array<Player>): Array<{ connected: boolean; id: string; name: string }> => {
	return players.map((player: Player): { connected: boolean; id: string; name: string } => {
		const { name, playerId } = player;
		return {
			connected: isPlayerConnected(player),
			id: playerId,
			name,
		};
	});
};

export const sendGameState = (state: any, eventByPlayerId: string): void => {
	const { value: phase, context } = state;
	const { activePlayerId, gameId, issues, gameOwnerId, players } = context;
	const playerIndex = getPlayerIndex(players, eventByPlayerId);
	const { avatarId, playerId, websocket } = players[playerIndex];
	sendJSObject(websocket, {
		type: 'GAME_STATE',
		avatarId,
		activePlayerId,
		eventByPlayerId,
		gameId,
		gameOwnerId,
		phase,
		playerId,
		players: getPlayersState(players),
		issues,
	});
};

export const sendPlayerAdded = (context: Context, eventByPlayerId: string): void => {
	const { gameId, gameOwnerId, players } = context;
	players.forEach(({ playerId, websocket }) => {
		if (playerId !== eventByPlayerId) {
			sendJSObject(websocket, {
				type: 'PLAYER_ADDED',
				eventByPlayerId,
				gameId,
				gameOwnerId,
				playerId,
				players: getPlayersState(players),
			});
		}
	});
};

export const sendUpdatedPoints = (context: Context, issue: Issue, eventByPlayerId: string): void => {
	const { gameId, players } = context;
	players.forEach(({ playerId, websocket }) => {
		sendJSObject(websocket, {
			type: 'UPDATED_POINTS',
			eventByPlayerId,
			gameId,
			issue,
			playerId,
			players: getPlayersState(players),
		});
	});
};

export const sendIssueOpened = (context: Context, issueId: string, eventByPlayerId: string): void => {
	const { gameId, players } = context;
	players.forEach(({ playerId, websocket }) => {
		sendJSObject(websocket, {
			type: 'ISSUE_OPENED',
			eventByPlayerId,
			gameId,
			issueId,
			playerId,
			players: getPlayersState(players),
		});
	});
};

export const sendIssueClosed = (context: Context, issueId: string, eventByPlayerId: string): void => {
	const { gameId, players } = context;
	players.forEach(({ playerId, websocket }) => {
		sendJSObject(websocket, {
			type: 'ISSUE_CLOSED',
			eventByPlayerId,
			gameId,
			playerId,
			players: getPlayersState(players),
			issueId,
		});
	});
};

export const sendMoveConfirmed = (context: Context, eventByPlayerId: string): void => {
	const { activePlayerId, gameId, players } = context;
	players.forEach(({ playerId, websocket }) => {
		sendJSObject(websocket, {
			type: 'MOVE_CONFIRMED',
			activePlayerId,
			eventByPlayerId,
			gameId,
			playerId,
			players: getPlayersState(players),
		});
	});
};

export const sendPlayerSkipped = (state: any, eventByPlayerId: string): void => {
	const { value: phase, context }: { value: string; context: Context } = state;
	const { activePlayerId, gameId, players } = context;
	players.forEach(({ playerId, websocket }) => {
		sendJSObject(websocket, {
			type: 'PLAYER_SKIPPED',
			activePlayerId,
			eventByPlayerId,
			gameId,
			phase,
			playerId,
			players: getPlayersState(players),
		});
	});
};
