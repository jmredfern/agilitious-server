'use strict';

import { getLoggerByFilename } from '../util/logger';
import { Logger } from 'log4js';
import { validateFibonacciNumber } from '../util/points';
import {
	sendGameState,
	sendIssueClosed,
	sendIssueOpened,
	sendPlayerAdded,
	sendUpdatedPoints,
	sendMoveConfirmed,
	sendPlayerSkipped,
} from '../services/clientEvents';
import { createPlayer, getNewActivePlayerId, getPlayer, getPlayerIndex } from '../util/player';
import { inspect } from 'util';
import { Action, Issue } from '../types';

const log: Logger = getLoggerByFilename(__filename);

const actions: {
	[actionName: string]: Action;
} = {};

actions.createGame = (context, event, { action, state }) => {
	const { players } = context;
	const { playerId } = event;

	context.activePlayerId = playerId;
	context.avatarSetId = event.avatarSetId;
	const player = createPlayer(context, event);
	players.push(player);

	sendGameState(state, playerId);
};

actions.addPlayer = (context, event, { action, state }) => {
	const { players } = context;
	const { playerId } = event;

	const player = createPlayer(context, event);
	const playerIndex = getPlayerIndex(players, playerId);
	if (playerIndex !== -1) {
		players[playerIndex] = player;
	} else {
		players.push(player);
	}
	sendGameState(state, playerId);
	sendPlayerAdded(context, playerId);
};

actions.updatePoints = (context, event, { action, state }) => {
	const { issues } = context;
	const { issueId, playerId, points } = event;
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

actions.openIssue = (context, event, { action, state }) => {
	const { issueId, playerId } = event;
	sendIssueOpened(context, issueId, playerId);
};

actions.closeIssue = (context, event, { action, state }) => {
	const { issueId, playerId } = event;
	sendIssueClosed(context, issueId, playerId);
};

actions.confirmMove = (context, event, { action, state }) => {
	const { activePlayerId, players } = context;
	const { playerId } = event;
	const player = getPlayer(players, playerId);
	player.finished = false;
	context.activePlayerId = getNewActivePlayerId({ activePlayerId, players });
	sendMoveConfirmed(context, playerId);
};

actions.noChange = (context, event, { action, state }) => {
	const { activePlayerId, players } = context;
	const { playerId } = event;
	context.activePlayerId = getNewActivePlayerId({ activePlayerId, players });
	const player = getPlayer(players, playerId);
	player.finished = true;
	sendPlayerSkipped(state, playerId);
};

export default actions;
