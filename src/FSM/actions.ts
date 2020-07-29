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
} from '../services/clientEvents';
import { createPlayer, getNextPlayerId, getPlayer, getPlayerIndex } from '../util/player';
import { inspect } from 'util';
import {
	Action,
	CloseIssueEvent,
	ConfirmMoveEvent,
	Context,
	CreateGameEvent,
	FSMEvent,
	FSMTypestate,
	Issue,
	JoinGameEvent,
	NoChangeEvent,
	OpenIssueEvent,
	PlayerStatus,
	UpdatePointsEvent,
} from '../types';

const { AwaitingMove, ConfirmedChange } = PlayerStatus;

const log: Logger = getLoggerByFilename(__filename);

const actions: {
	[actionName: string]: Action;
} = {};

actions.createGame = (context: Context, event: FSMEvent, { state }: { state: FSMTypestate }): void => {
	const { players } = context;
	const { avatarSetId, playerId } = <CreateGameEvent>event;

	context.activePlayerId = playerId;
	context.avatarSetId = avatarSetId;
	const player = createPlayer(context, <CreateGameEvent>event);
	players.push(player);

	sendGameState(state, playerId);
};

actions.addPlayer = (context: Context, event: FSMEvent, { state }: { state: FSMTypestate }): void => {
	const { players } = context;
	const { playerId, websocket } = <JoinGameEvent>event;

	const playerIndex = getPlayerIndex(players, playerId);
	if (playerIndex !== -1) {
		log.info(`Updating player ${playerId} websocket`);
		players[playerIndex].websocket = websocket;
	} else {
		const player = createPlayer(context, <JoinGameEvent>event);
		players.push(player);
	}
	sendGameState(state, playerId);
	sendPlayerAdded(context, playerId);
};

actions.updatePoints = (context: Context, event: FSMEvent): void => {
	const { issues } = context;
	const { issueId, playerId, points } = <UpdatePointsEvent>event;
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

actions.openIssue = (context: Context, event: FSMEvent): void => {
	const { issueId, playerId } = <OpenIssueEvent>event;
	sendIssueOpened(context, issueId, playerId);
};

actions.closeIssue = (context: Context, event: FSMEvent): void => {
	const { issueId, playerId } = <CloseIssueEvent>event;
	sendIssueClosed(context, issueId, playerId);
};

actions.confirmMove = (context: Context, event: FSMEvent, { state }: { state: FSMTypestate }): void => {
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

actions.noChange = (context: Context, event: FSMEvent, { state }: { state: FSMTypestate }): void => {
	const { activePlayerId, players } = context;
	const { playerId } = <NoChangeEvent>event;
	const player = getPlayer(players, playerId);
	player.status = PlayerStatus.Skipped;
	context.activePlayerId = getNextPlayerId({ activePlayerId, players });
	sendPlayerSkipped(state, playerId);
};

export default actions;
