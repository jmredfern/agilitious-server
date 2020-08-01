'use strict';

import { sendServerEvent } from '../util/websocket';
import { getPlayerIndex, isPlayerConnected } from '../util/player';
import {
	FSMContext,
	Issue,
	Player,
	PlayerState,
	UUID,
	GameStateServerEvent,
	PlayerAddedServerEvent,
	UpdatedPointsServerEvent,
	IssueOpenedServerEvent,
	IssueClosedServerEvent,
	MoveConfirmedServerEvent,
	PlayerSkippedServerEvent,
	FSMTypestate,
	PlayerDisconnectServerEvent as PlayerDisconnectedServerEvent,
	GameActivatedServerEvent,
} from 'types';
import * as uuid from 'uuid';
import { getPhase } from '../util/state';

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

export const sendGameState = (state: FSMTypestate, eventByPlayerId: UUID): void => {
	const { value: stateValue, context } = state;
	const { activePlayerId, gameId, issues, gameOwnerId, players } = context;
	const playerIndex = getPlayerIndex(players, eventByPlayerId);
	const player = players[playerIndex];
	const event: GameStateServerEvent = {
		type: 'GAME_STATE',
		id: <UUID>uuid.v4(),
		eventByPlayerId,

		activePlayerId,
		gameOwnerId,
		phase: getPhase(stateValue),
		playerId: player.playerId,
		players: getPlayersState(players),
		issues, // Put this one last so that issues is the field trimmed when logging the event
	};
	sendServerEvent(player, gameId, event);
};

export const sendUpdatedPoints = (context: FSMContext, issue: Issue, eventByPlayerId: UUID): void => {
	const { gameId, players } = context;
	const event: UpdatedPointsServerEvent = {
		type: 'UPDATED_POINTS',
		id: <UUID>uuid.v4(),
		eventByPlayerId,

		issue,
	};
	players.forEach(player => {
		sendServerEvent(player, gameId, event);
	});
};

export const sendGameActivated = (state: FSMTypestate): void => {
	const { value: stateValue, context } = state;
	const { gameId, players } = context;
	const event: GameActivatedServerEvent = {
		type: 'GAME_ACTIVATED',
		id: <UUID>uuid.v4(),

		phase: getPhase(stateValue),
	};
	players.forEach(player => {
		sendServerEvent(player, gameId, event);
	});
};

export const sendIssueOpened = (context: FSMContext, issueId: UUID, eventByPlayerId: UUID): void => {
	const { gameId, players } = context;
	const event: IssueOpenedServerEvent = {
		type: 'ISSUE_OPENED',
		id: <UUID>uuid.v4(),
		eventByPlayerId,

		issueId,
	};
	players.forEach(player => {
		sendServerEvent(player, gameId, event);
	});
};

export const sendIssueClosed = (context: FSMContext, issueId: UUID, eventByPlayerId: UUID): void => {
	const { gameId, players } = context;
	const event: IssueClosedServerEvent = {
		type: 'ISSUE_CLOSED',
		id: <UUID>uuid.v4(),
		eventByPlayerId,
	};
	players.forEach(player => {
		sendServerEvent(player, gameId, event);
	});
};

export const sendPlayerAdded = (context: FSMContext, eventByPlayerId: UUID): void => {
	const { gameId, players } = context;
	const event: PlayerAddedServerEvent = {
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

export const sendMoveConfirmed = (state: FSMTypestate, eventByPlayerId: UUID): void => {
	const { value: stateValue, context } = state;
	const { activePlayerId, gameId, players } = context;
	const event: MoveConfirmedServerEvent = {
		type: 'MOVE_CONFIRMED',
		id: <UUID>uuid.v4(),
		eventByPlayerId,

		activePlayerId,
		phase: getPhase(stateValue),
	};
	players.forEach(player => {
		sendServerEvent(player, gameId, event);
	});
};

export const sendPlayerSkipped = (state: FSMTypestate, eventByPlayerId: UUID): void => {
	const { value: stateValue, context } = state;
	const { activePlayerId, gameId, players } = context;
	const event: PlayerSkippedServerEvent = {
		type: 'PLAYER_SKIPPED',
		id: <UUID>uuid.v4(),
		eventByPlayerId,

		activePlayerId,
		phase: getPhase(stateValue),
	};
	players.forEach(player => {
		sendServerEvent(player, gameId, event);
	});
};

export const sendPlayerDisconnected = (state: FSMTypestate, eventByPlayerId: UUID): void => {
	const { value: stateValue, context } = state;
	const { activePlayerId, gameId, players } = context;
	const event: PlayerDisconnectedServerEvent = {
		type: 'PLAYER_DISCONNECTED',
		id: <UUID>uuid.v4(),
		eventByPlayerId,

		activePlayerId,
		phase: getPhase(stateValue),
	};
	players.forEach(player => {
		sendServerEvent(player, gameId, event);
	});
};
