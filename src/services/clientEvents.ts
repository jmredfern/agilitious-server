'use strict';

import { sendServerEvent } from '../util/websocket';
import { getPlayerIndex, isPlayerConnected } from '../util/player';
import {
	Context,
	Issue,
	Player,
	PlayerState,
	UUID,
	GameStateEvent,
	PlayerAddedEvent,
	UpdatedPointsEvent,
	IssueOpenedEvent,
	IssueClosedEvent,
	MoveConfirmedEvent,
	PlayerSkippedEvent,
} from '../types';
import * as uuid from 'uuid';

const getPlayersState = (players: Array<Player>): Array<PlayerState> => {
	return players.map(
		(player: Player): PlayerState => {
			const { name, playerId, avatarId } = player;
			return {
				connected: isPlayerConnected(player),
				id: playerId,
				name,
				avatarId,
			};
		},
	);
};

export const sendGameState = (state: any, eventByPlayerId: UUID): void => {
	const { value: phase, context } = state;
	const { activePlayerId, gameId, issues, gameOwnerId, players } = context;
	const playerIndex = getPlayerIndex(players, eventByPlayerId);
	const player = players[playerIndex];
	const event: GameStateEvent = {
		type: 'GAME_STATE',
		id: uuid.v4(),
		gameId,
		eventByPlayerId,
		players: getPlayersState(players),
		playerId: player.playerId, // Probably don't need playerId on the other server events
		activePlayerId,
		gameOwnerId,
		phase,
		issues,
	};
	sendServerEvent(player, event);
};

export const sendPlayerAdded = (context: Context, eventByPlayerId: UUID): void => {
	const { gameId, players } = context;
	const event: PlayerAddedEvent = {
		type: 'PLAYER_ADDED',
		id: uuid.v4(),
		gameId,
		eventByPlayerId,
		players: getPlayersState(players),
	};
	players.forEach(player => {
		const { playerId } = player;

		if (playerId !== eventByPlayerId) {
			sendServerEvent(player, {
				...event,
				playerId: player.playerId,
			});
		}
	});
};

export const sendUpdatedPoints = (context: Context, issue: Issue, eventByPlayerId: UUID): void => {
	const { gameId, players } = context;
	const event: UpdatedPointsEvent = {
		type: 'UPDATED_POINTS',
		id: uuid.v4(),
		gameId,
		eventByPlayerId,
		players: getPlayersState(players),

		issue,
	};
	players.forEach(player => {
		sendServerEvent(player, {
			...event,
			playerId: player.playerId,
		});
	});
};

export const sendIssueOpened = (context: Context, issueId: string, eventByPlayerId: UUID): void => {
	const { gameId, players } = context;
	const event: IssueOpenedEvent = {
		type: 'ISSUE_OPENED',
		id: uuid.v4(),
		gameId,
		eventByPlayerId,
		players: getPlayersState(players),

		issueId,
	};
	players.forEach(player => {
		sendServerEvent(player, {
			...event,
			playerId: player.playerId,
		});
	});
};

export const sendIssueClosed = (context: Context, issueId: string, eventByPlayerId: UUID): void => {
	const { gameId, players } = context;
	const event: IssueClosedEvent = {
		type: 'ISSUE_CLOSED',
		id: uuid.v4(),
		gameId,
		eventByPlayerId,
		players: getPlayersState(players),

		issueId,
	};
	players.forEach(player => {
		sendServerEvent(player, {
			...event,
			playerId: player.playerId,
		});
	});
};

export const sendMoveConfirmed = (context: Context, eventByPlayerId: UUID): void => {
	const { activePlayerId, gameId, players } = context;
	const event: MoveConfirmedEvent = {
		type: 'MOVE_CONFIRMED',
		id: uuid.v4(),
		gameId,
		eventByPlayerId,
		players: getPlayersState(players),

		activePlayerId,
	};
	players.forEach(player => {
		sendServerEvent(player, {
			...event,
			playerId: player.playerId,
		});
	});
};

export const sendPlayerSkipped = (state: any, eventByPlayerId: UUID): void => {
	const { value: phase, context }: { value: string; context: Context } = state;
	const { activePlayerId, gameId, players } = context;
	const event: PlayerSkippedEvent = {
		type: 'PLAYER_SKIPPED',
		id: uuid.v4(),
		gameId,
		eventByPlayerId,
		players: getPlayersState(players),

		activePlayerId,
		phase,
	};
	players.forEach(player => {
		sendServerEvent(player, {
			...event,
			playerId: player.playerId,
		});
	});
};
