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
		id: <UUID>uuid.v4(),
		eventByPlayerId,

		activePlayerId,
		gameOwnerId,
		phase,
		playerId: player.playerId,
		players: getPlayersState(players),
		issues, // Put this one last so that issues is the field trimmed when logging the event
	};
	sendServerEvent(player, gameId, event);
};

export const sendUpdatedPoints = (context: Context, issue: Issue, eventByPlayerId: UUID): void => {
	const { gameId, players } = context;
	const event: UpdatedPointsEvent = {
		type: 'UPDATED_POINTS',
		id: <UUID>uuid.v4(),
		eventByPlayerId,

		issue,
	};
	players.forEach(player => {
		sendServerEvent(player, gameId, event);
	});
};

export const sendIssueOpened = (context: Context, issueId: UUID, eventByPlayerId: UUID): void => {
	const { gameId, players } = context;
	const event: IssueOpenedEvent = {
		type: 'ISSUE_OPENED',
		id: <UUID>uuid.v4(),
		eventByPlayerId,

		issueId,
	};
	players.forEach(player => {
		sendServerEvent(player, gameId, event);
	});
};

export const sendIssueClosed = (context: Context, issueId: UUID, eventByPlayerId: UUID): void => {
	const { gameId, players } = context;
	const event: IssueClosedEvent = {
		type: 'ISSUE_CLOSED',
		id: <UUID>uuid.v4(),
		eventByPlayerId,
	};
	players.forEach(player => {
		sendServerEvent(player, gameId, event);
	});
};

export const sendPlayerAdded = (context: Context, eventByPlayerId: UUID): void => {
	const { gameId, players } = context;
	const event: PlayerAddedEvent = {
		type: 'PLAYER_ADDED',
		id: <UUID>uuid.v4(),
		eventByPlayerId,

		players: getPlayersState(players),
	};
	players.forEach(player => {
		const { playerId } = player;

		if (playerId !== eventByPlayerId) {
			sendServerEvent(player, gameId, event);
		}
	});
};

export const sendMoveConfirmed = (state: any, eventByPlayerId: UUID): void => {
	const { value: phase, context }: { value: string; context: Context } = state;
	const { activePlayerId, gameId, players } = <Required<Context>>context;
	const event: MoveConfirmedEvent = {
		type: 'MOVE_CONFIRMED',
		id: <UUID>uuid.v4(),
		eventByPlayerId,

		activePlayerId,
		phase,
	};
	players.forEach(player => {
		sendServerEvent(player, gameId, event);
	});
};

export const sendPlayerSkipped = (state: any, eventByPlayerId: UUID): void => {
	const { value: phase, context }: { value: string; context: Context } = state;
	const { activePlayerId, gameId, players } = <Required<Context>>context;
	const event: PlayerSkippedEvent = {
		type: 'PLAYER_SKIPPED',
		id: <UUID>uuid.v4(),
		eventByPlayerId,

		activePlayerId,
		phase,
	};
	players.forEach(player => {
		sendServerEvent(player, gameId, event);
	});
};
