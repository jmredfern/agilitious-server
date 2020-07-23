'use strict';

import { getLoggerByFilename } from '../util/logger';
import { getIssues } from '../services/issueStore';
import { Machine, interpret } from 'xstate';
import hardCodedIssues from '../../data/issuesSmall.json';
import { Logger } from 'log4js';
import { isActivePlayer, isLastPlayer } from './guards';
import actions from './actions';
import * as uuid from 'uuid';
import { UUID, Context, ClientEvent } from '../types';
import WebSocket from 'ws';

const log: Logger = getLoggerByFilename(__filename);

const FSMs: { [key: string]: any } = {};

const createMachine = (gameId: UUID, gameOwnerId: UUID): any => {
	return Machine(
		{
			context: {
				activePlayerId: '',
				avatarSetId: '',
				gameId,
				issues: getIssues(gameId) || hardCodedIssues.issues,
				gameOwnerId,
				players: [],
			},
			id: 'game',
			initial: 'START',
			states: {
				START: {
					on: {
						CREATE_GAME: {
							target: 'PLAYING',
							actions: ['createGame'],
						},
					},
				},
				PLAYING: {
					on: {
						JOIN_GAME: {
							target: 'PLAYING',
							actions: ['addPlayer'],
						},
						UPDATE_POINTS: {
							target: 'PLAYING',
							actions: ['updatePoints'],
							cond: isActivePlayer,
						},
						OPEN_ISSUE: {
							target: 'PLAYING',
							actions: ['openIssue'],
							cond: isActivePlayer,
						},
						CLOSE_ISSUE: {
							target: 'PLAYING',
							actions: ['closeIssue'],
							cond: isActivePlayer,
						},
						CONFIRM_MOVE: {
							target: 'PLAYING',
							actions: ['confirmMove'],
							cond: isActivePlayer,
						},
						NO_CHANGE: [
							{
								target: 'PLAYING',
								actions: ['noChange'],
								cond: (context: Context, event: any) => {
									return isActivePlayer(context, event) && !isLastPlayer(context, event);
								},
							},
							{
								target: 'FINISHED',
								actions: ['noChange'],
								cond: (context: Context, event: any) => {
									return isActivePlayer(context, event) && isLastPlayer(context, event);
								},
							},
						],
					},
				},
				FINISHED: {
					type: 'final',
					// TODO cleanup/remove data from memory after timer
				},
			},
		},
		{ actions },
	);
};

const createService = (gameId: UUID, gameOwnerId: UUID): any => {
	const machine = createMachine(gameId, gameOwnerId);
	const service = interpret(machine).onTransition(state => log.info(state.value));
	return service;
};

const getFSM = (gameId: UUID, playerId: UUID): any => {
	if (!FSMs[gameId]) {
		const gameOwnerId = playerId;
		const service = createService(gameId, gameOwnerId);
		service.start();
		FSMs[gameId] = service;
	}

	return FSMs[gameId];
};

export const processPlayerEvent = (event: ClientEvent, websocket: WebSocket): void => {
	const { gameId = uuid.v4(), playerId = uuid.v4() } = event;
	const FSM = getFSM(gameId, playerId);
	FSM.send({ ...event, playerId, websocket });
};
