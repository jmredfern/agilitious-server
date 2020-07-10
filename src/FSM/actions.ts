'use strict';

import logger from '../util/logger';
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
import {
	getNewActivePlayerId,
	getPlayer,
	getPlayerIndex,
} from '../util/player';
import { inspect } from 'util';
import { Context, Issue } from '../types';

const log: Logger = logger.getLoggerByFilename(__filename);

export const addPlayer = (context: Context, event: any, { action, state }: any) => {
	const { players } = context;
	const { name, playerId, websocket } = event;
	const player = { name, playerId, websocket };
	const playerIndex = getPlayerIndex(players, playerId);
	if (playerIndex !== -1) {
	  players[playerIndex] = player;
	} else {
	  players.push(player);
	}
	if (players.length === 1) {
	  context.activePlayerId = playerId;
	}
	sendGameState(state, playerId);
	sendPlayerAdded(context, playerId);
};

export const updatePoints = (context: Context, event: any, { action, state }: any) => {
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

export const openIssue = (context: Context, event: any, { action, state }: any) => {
	const { issueId, playerId } = event;
	sendIssueOpened(context, issueId, playerId);
};

export const closeIssue = (context: Context, event: any, { action, state }: any) => {
	const { issueId, playerId } = event;
	sendIssueClosed(context, issueId, playerId);
};

export const confirmMove = (context: Context, event: any, { action, state }: any) => {
	const { activePlayerId, players } = context;
	const { playerId } = event;
	const player = getPlayer(players, playerId);
	player.finished = false;
	context.activePlayerId = getNewActivePlayerId({ activePlayerId, players });
	sendMoveConfirmed(context, playerId);
};

export const noChange = (context: Context, event: any, { action, state }: any) => {
	const { activePlayerId, players } = context;
	const { playerId } = event;
	context.activePlayerId = getNewActivePlayerId({ activePlayerId, players }); 
	const player = getPlayer(players, playerId);
	player.finished = true;
	sendPlayerSkipped(state, playerId);
};
