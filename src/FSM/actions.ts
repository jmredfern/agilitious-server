'use strict';

import { Logger } from 'log4js';
import { inspect } from 'util';
import * as uuid from 'uuid';
import * as gamesDAO from '../DAO/games';
import { updateIssuesInJira } from '../services/jiraService';
import { clearIssues } from '../services/issueStore';
import {
	sendGameActivated,
	sendGameState,
	sendIssueClosed,
	sendIssueOpened,
	sendMoveConfirmed,
	sendPlayerAdded,
	sendPlayerDisconnected,
	sendPlayerSkipped,
	sendUpdatedIssue,
} from '../services/serverEvents';
import {
	CloseIssueClientEvent,
	ConfirmMoveEvent,
	CreateGameClientEvent,
	FSMContext,
	FSMEvent,
	Issue,
	JoinGameClientEvent,
	NoChangeClientEvent,
	OpenIssueClientEvent,
	PlayerDisconnectClientEvent,
	PlayerStatus,
	UpdatePointsClientEvent,
	UUID,
	GameOwner,
	AddCommentClientEvent,
	Player,
} from '../types';
import { getLoggerByFilename } from '../util/logger';
import { createPlayer, getNextPlayerId, getPlayer, getPlayerIndex } from '../util/player';
import { validateFibonacciNumber } from '../util/points';
import * as fsmStore from './fsmStore';
import { allPlayersConnected } from './guards';
import { ActionFunction } from 'xstate';

const { AwaitingMove, ConfirmedChange } = PlayerStatus;

const log: Logger = getLoggerByFilename(__filename);

const actions: {
	[actionName: string]: ActionFunction<FSMContext, FSMEvent>;
} = {};

const transitionToActivate = (gameId: UUID) => {
	const fsmService = fsmStore.getFSM(gameId);
	if (fsmService) {
		fsmService.send(<FSMEvent>{
			id: <UUID>uuid.v4(),
			gameId: gameId,
			type: 'ACTIVATE',
		});
	}
};

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
	const updatePointsClientEvent = <UpdatePointsClientEvent>event;
	const { issueId, playerId, points } = updatePointsClientEvent;
	if (!validateFibonacciNumber(points)) {
		log.warn(`Tried to update story points with non fibonacci number!! [event:${inspect(event)}]`);
		return;
	}
	const issue = issues.find(({ id }: Issue): boolean => id === issueId);
	if (issue) {
		issue.currentPoints = points;
		context.currentMoves[updatePointsClientEvent.issueId] = updatePointsClientEvent;
	} else {
		log.warn(`Issue not found while trying to update points. [issueId:${issueId}]`);
		return;
	}
	sendUpdatedIssue(context, issue, playerId);
};

actions.addComment = (context: FSMContext, event: FSMEvent): void => {
	const { issues, players } = context;
	const addCommentClientEvent = <AddCommentClientEvent>event;
	const { issueId, playerId, comment } = addCommentClientEvent;
	const player = players.find(({ playerId: id }: Player) => id === playerId);
	if (player) {
		addCommentClientEvent.comment = `${player.name} commented: ${comment}`;
		context.moveHistory.push(addCommentClientEvent);
	} else {
		log.warn(`Player not found while trying to add coment. [issueId:${issueId}]`);
		return;
	}
	const issue = issues.find(({ id }: Issue): boolean => id === issueId);
	if (issue) {
		issue.comments.push({
			author: player.name,
			body: addCommentClientEvent.comment,
		});
	} else {
		log.warn(`Issue not found while trying to update points. [issueId:${issueId}]`);
		return;
	}
	sendUpdatedIssue(context, issue, playerId);
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
	players.forEach((player) => {
		if (player.playerId === playerId) {
			player.status = ConfirmedChange;
		} else {
			player.status = AwaitingMove;
		}
	});
	context.activePlayerId = getNextPlayerId({ activePlayerId, players });
	context.moveHistory.push(...Object.values(context.currentMoves));
	context.currentMoves = {};
	sendMoveConfirmed(state, playerId);
};

actions.noChange = (context: FSMContext, event: FSMEvent, { state }: any): void => {
	const { activePlayerId, players } = context;
	const { playerId } = <NoChangeClientEvent>event;
	const player = getPlayer(players, playerId);
	player.status = PlayerStatus.Skipped;
	context.activePlayerId = getNextPlayerId({ activePlayerId, players });
	context.currentMoves = {};
	sendPlayerSkipped(state, playerId);
};

actions.playerDisconnect = (context: FSMContext, event: FSMEvent, { state }: any): void => {
	const disconnectGracePeriodMs = 20000;
	const { activePlayerId, players } = context;
	const { playerId } = <PlayerDisconnectClientEvent>event;
	const cancelPlayerDisconnect = setTimeout(() => {
		if (activePlayerId === playerId) {
			context.activePlayerId = getNextPlayerId({ activePlayerId, players });
			context.currentMoves = {};
		}
		sendPlayerDisconnected(state, playerId);
	}, disconnectGracePeriodMs);
	const player = getPlayer(players, playerId);
	player.ephemeral.cancelPlayerDisconnect = cancelPlayerDisconnect;
};

actions.activateGame = (context: FSMContext, event: FSMEvent, { state }: any): void => {
	sendGameActivated(state);
};

actions.activateIfAllPlayersConnected = (context: FSMContext, event: FSMEvent): void => {
	const { gameId } = context;
	if (allPlayersConnected(context)) {
		if (context.ephemeral.cancelScheduledActivate) {
			clearTimeout(context.ephemeral.cancelScheduledActivate);
			delete context.ephemeral.cancelScheduledActivate;
			log.info(
				`Clearing scheduled re-activation, gameId: ${gameId}, event ${event.type} ${event.id} playerId ${event.playerId}`,
			);
		}
		transitionToActivate(gameId);
		log.info(
			`All players have reconnected, game activated gameId: ${gameId}, event ${event.type} ${event.id} playerId ${event.playerId}`,
		);
	}
};

actions.scheduleActivate = async (context: FSMContext, event: FSMEvent): Promise<void> => {
	const activateDelayMs = 5000;
	if (context.ephemeral.cancelScheduledActivate) {
		// scheduler already activated
		return;
	}
	const { gameId } = context;
	const cancelScheduledActivate = setTimeout(async () => {
		transitionToActivate(gameId);
		log.info(
			`Executed scheduled re-activation, gameId: ${gameId}, event ${event.type} ${event.id} playerId ${event.playerId}`,
		);
	}, activateDelayMs);
	context.ephemeral.cancelScheduledActivate = cancelScheduledActivate;
	log.info(`Scheduled re-activation, gameId: ${gameId}, event ${event.type} ${event.id} playerId ${event.playerId}`);
};

actions.scheduleCleanup = async (context: FSMContext, event: FSMEvent): Promise<void> => {
	const cleanupDelayHours = 8;
	const cleanupDelayMs = cleanupDelayHours * 60 * 60 * 1000;
	setTimeout(async () => {
		const { gameId } = context;
		clearIssues(gameId);
		fsmStore.removeFSM(gameId);
		await gamesDAO.deleteGame(gameId);
		log.info(
			`Executed scheduled clean up, gameId: ${gameId}, event ${event.type} ${event.id} playerId ${event.playerId}`,
		);
	}, cleanupDelayMs);
};

actions.updateJira = async (context: FSMContext): Promise<void> => {
	const { moveHistory, gameOwner, sourceIssues } = context;
	const { jiraCompanyName, jiraEmail, jiraAPIToken } = <GameOwner>gameOwner;
	await updateIssuesInJira(moveHistory, jiraCompanyName, jiraEmail, jiraAPIToken, sourceIssues);
};

export default actions;
