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
import { createPlayer, getNextPlayerId, getPlayer, getPlayerIndex } from '../util/player';
import { inspect } from 'util';
import { Action, Issue, Context, ClientEvent, PlayerStatus } from '../types';

const { AwaitingMove, ConfirmedChange } = PlayerStatus;

const log: Logger = getLoggerByFilename(__filename);

const actions: {
	[actionName: string]: Action;
} = {};

actions.createGame = (context: Context, event: ClientEvent, { state }: any): void => {
	const { players } = context;
	const { playerId } = event;

	context.activePlayerId = playerId;
	context.avatarSetId = event.avatarSetId;
	const player = createPlayer(context, event);
	players.push(player);

	sendGameState(state, playerId);
};

actions.addPlayer = (context: Context, event: any, { state }: any): void => {
	const { players } = context;
	const { playerId, websocket } = event;

	const playerIndex = getPlayerIndex(players, playerId);
	if (playerIndex !== -1) {
		log.info(`Updating player ${playerId} websocket`);
		players[playerIndex].websocket = websocket;
	} else {
		const player = createPlayer(context, event);
		players.push(player);
	}
	sendGameState(state, playerId);
	sendPlayerAdded(context, playerId);
};

actions.updatePoints = (context: Context, event: any): void => {
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

actions.openIssue = (context: Context, event: any): void => {
	const { issueId, playerId } = event;
	sendIssueOpened(context, issueId, playerId);
};

actions.closeIssue = (context: Context, event: any): void => {
	const { issueId, playerId } = event;
	sendIssueClosed(context, issueId, playerId);
};

actions.confirmMove = (context: Context, event: any, { state }: any): void => {
	const { activePlayerId, players } = <Required<Context>>context;
	const { playerId } = event;
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

actions.noChange = (context: Context, event: any, { state }: any): void => {
	const { activePlayerId, players } = <Required<Context>>context;
	const { playerId } = event;
	const player = getPlayer(players, playerId);
	player.status = PlayerStatus.Skipped;
	context.activePlayerId = getNextPlayerId({ activePlayerId, players });
	sendPlayerSkipped(state, playerId);
};

export default actions;
