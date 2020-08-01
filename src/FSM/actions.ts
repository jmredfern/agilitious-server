'use strict';

import { getLoggerByFilename } from '../util/logger';
import { Logger } from 'log4js';
import { validateFibonacciNumber } from '../util/points';
import {
	sendGameState,
	sendIssueClosed,
	sendIssueOpened,
	sendMoveConfirmed,
	sendPlayerAdded,
	sendPlayerSkipped,
	sendUpdatedPoints,
	sendPlayerDisconnected,
	sendGameActivated,
} from '../services/serverEvents';
import { createPlayer, getNextPlayerId, getPlayer, getPlayerIndex } from '../util/player';
import { inspect } from 'util';
import {
	Action,
	CloseIssueClientEvent,
	ConfirmMoveEvent,
	FSMContext,
	CreateGameClientEvent,
	FSMEvent,
	Issue,
	JoinGameClientEvent,
	NoChangeClientEvent,
	OpenIssueClientEvent,
	PlayerStatus,
	UpdatePointsClientEvent,
	PlayerDisconnectClientEvent,
} from '../types';

const { AwaitingMove, ConfirmedChange } = PlayerStatus;

const log: Logger = getLoggerByFilename(__filename);

const actions: {
	[actionName: string]: Action;
} = {};

actions.createGame = (context: FSMContext, event: FSMEvent, { state }: any): void => {
	const { players } = context;
	const { avatarSetId, playerId } = <CreateGameClientEvent>event;

	context.activePlayerId = playerId;
	context.avatarSetId = avatarSetId;
	const player = createPlayer(context, <CreateGameClientEvent>event);
	players.push(player);

	sendGameState(state, playerId);
};

actions.addPlayer = (context: FSMContext, event: FSMEvent, { state }: any): void => {
	const { gameId, players } = context;
	const { playerId, websocket } = <JoinGameClientEvent>event;

	const playerIndex = getPlayerIndex(players, playerId);
	if (playerIndex !== -1) {
		log.info(`Updating player ${playerId} websocket`);
		const player = players[playerIndex];
		player.websocket = websocket;
		if (player.ephemeral.cancelPlayerDisconnect) {
			clearTimeout(player.ephemeral.cancelPlayerDisconnect);
			delete player.ephemeral.cancelPlayerDisconnect;
		}
	} else {
		const player = createPlayer(context, <JoinGameClientEvent>event);
		players.push(player);
		log.info(`Added player ${playerId} to game ${gameId}`);
	}
	// Storing gameId and playerId on websocket so that if a player's websocket disconnects the
	// websocket can be used to lookup the player and skip their game turn
	websocket.gameId = gameId;
	websocket.playerId = playerId;
	sendGameState(state, playerId);
	sendPlayerAdded(context, playerId);
};

actions.updatePoints = (context: FSMContext, event: FSMEvent): void => {
	const { issues } = context;
	const { issueId, playerId, points } = <UpdatePointsClientEvent>event;
	if (!validateFibonacciNumber(points)) {
		log.warn(`Tried to update story points with non fibonacci number!! [event:${inspect(event)}]`);
		return;
	}
	const issue = issues.find(({ id }: Issue): boolean => id === issueId);
	if (issue) {
		issue.currentPoints = points;
	} else {
		log.warn(`Issue not found while trying to update points. [issueId:${issueId}]`);
		return;
	}
	sendUpdatedPoints(context, issue, playerId);
};

actions.openIssue = (context: FSMContext, event: FSMEvent): void => {
	const { issueId, playerId } = <OpenIssueClientEvent>event;
	sendIssueOpened(context, issueId, playerId);
};

actions.closeIssue = (context: FSMContext, event: FSMEvent): void => {
	const { issueId, playerId } = <CloseIssueClientEvent>event;
	sendIssueClosed(context, issueId, playerId);
};

actions.confirmMove = (context: FSMContext, event: FSMEvent, { state }: any): void => {
	const { activePlayerId, players } = context;
	const { playerId } = <ConfirmMoveEvent>event;
	players.forEach(player => {
		if (player.playerId === playerId) {
			player.status = ConfirmedChange;
		} else {
			player.status = AwaitingMove;
		}
	});
	context.activePlayerId = getNextPlayerId({ activePlayerId, players });
	sendMoveConfirmed(state, playerId);
};

actions.noChange = (context: FSMContext, event: FSMEvent, { state }: any): void => {
	const { activePlayerId, players } = context;
	const { playerId } = <NoChangeClientEvent>event;
	const player = getPlayer(players, playerId);
	player.status = PlayerStatus.Skipped;
	context.activePlayerId = getNextPlayerId({ activePlayerId, players });
	sendPlayerSkipped(state, playerId);
};

actions.playerDisconnect = (context: FSMContext, event: FSMEvent, { state }: any): void => {
	const disconnectGracePeriodMs = 20000;
	const { activePlayerId, players } = context;
	const { playerId } = <PlayerDisconnectClientEvent>event;
	const cancelPlayerDisconnect = setTimeout(() => {
		if (activePlayerId === playerId) {
			context.activePlayerId = getNextPlayerId({ activePlayerId, players });
		}
		sendPlayerDisconnected(state, playerId);
	}, disconnectGracePeriodMs);
	const player = getPlayer(players, playerId);
	player.ephemeral.cancelPlayerDisconnect = cancelPlayerDisconnect;
};

actions.activateGame = (context: FSMContext, event: FSMEvent, { state }: any): void => {
	sendGameActivated(state);
};

export default actions;
