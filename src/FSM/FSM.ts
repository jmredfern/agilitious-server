'use strict';

import { getLoggerByFilename } from '../util/logger';
import { clearIssues, getIssues } from '../services/issueStore';
import { Machine, interpret, StateMachine, Interpreter } from 'xstate';
import hardCodedIssues from '../../data/issuesSmall.json';
import { Logger } from 'log4js';
import { isPlayersTurn, areOtherPlayersDone, isOnlyConnectedPlayer } from './guards';
import actions from './actions';
import * as uuid from 'uuid';
import {
	UUID,
	Context,
	ClientEvent,
	Player,
	FSMStateSchema,
	FSMEvent,
	ConfirmMoveEvent,
	NoChangeEvent,
	FSMTypestate,
} from '../types';
import WebSocket from 'ws';
import util from 'util';

const log: Logger = getLoggerByFilename(__filename);
const setTimeoutAsync = util.promisify(setTimeout);

const FSMs: { [key: string]: Interpreter<Context, FSMStateSchema, FSMEvent, FSMTypestate> } = {};

const createMachine = (gameId: UUID, gameOwnerId: UUID): StateMachine<Context, FSMStateSchema, FSMEvent> => {
	return Machine<Context, FSMStateSchema, FSMEvent>(
		{
			context: <Context>{
				gameId,
				issues: getIssues(gameId) || hardCodedIssues.issues,
				gameOwnerId,
				players: <Array<Player>>[],
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
							cond: isPlayersTurn,
						},
						OPEN_ISSUE: {
							target: 'PLAYING',
							actions: ['openIssue'],
							cond: isPlayersTurn,
						},
						CLOSE_ISSUE: {
							target: 'PLAYING',
							actions: ['closeIssue'],
							cond: isPlayersTurn,
						},
						CONFIRM_MOVE: [
							{
								target: 'PLAYING',
								actions: ['confirmMove'],
								cond: (context: Context, event: ConfirmMoveEvent) => {
									return isPlayersTurn(context, event) && !isOnlyConnectedPlayer(context, event);
								},
							},
							{
								target: 'FINISHED',
								actions: ['confirmMove'],
								cond: (context: Context, event: ConfirmMoveEvent) => {
									return isPlayersTurn(context, event) && isOnlyConnectedPlayer(context, event);
								},
							},
						],
						NO_CHANGE: [
							{
								target: 'PLAYING',
								actions: ['noChange'],
								cond: (context: Context, event: NoChangeEvent) => {
									return isPlayersTurn(context, event) && !areOtherPlayersDone(context, event);
								},
							},
							{
								target: 'FINISHED',
								actions: ['noChange'],
								cond: (context: Context, event: NoChangeEvent) => {
									return isPlayersTurn(context, event) && areOtherPlayersDone(context, event);
								},
							},
						],
					},
				},
				FINISHED: {
					entry: ['scheduleCleanup'],
					type: 'final',
				},
			},
		},
		{
			actions: {
				...actions,
				scheduleCleanup,
			},
		},
	);
};

const scheduleCleanup = async (context: Context): Promise<void> => {
	const cleanupDelayHours = 8;
	const cleanupDelayMs = cleanupDelayHours * 60 * 60 * 1000;
	await setTimeoutAsync(cleanupDelayMs);
	const { gameId } = context;
	clearIssues(gameId);
	delete FSMs[gameId];
	log.info(`Cleaning up gameId: ${gameId}`);
};

const createService = (
	gameId: UUID,
	gameOwnerId: UUID,
): Interpreter<Context, FSMStateSchema, FSMEvent, FSMTypestate> => {
	const machine = createMachine(gameId, gameOwnerId);
	const service = interpret(machine).onTransition(state => log.info(state.value));
	return service;
};

const getFSM = (gameId: UUID, playerId: UUID): Interpreter<Context, FSMStateSchema, FSMEvent, FSMTypestate> => {
	if (!FSMs[gameId]) {
		const gameOwnerId = playerId;
		const service = createService(gameId, gameOwnerId);
		service.start();
		FSMs[gameId] = service;
	}

	return FSMs[gameId];
};

export const processPlayerEvent = (event: ClientEvent, websocket: WebSocket): void => {
	const { gameId = <UUID>uuid.v4(), playerId = <UUID>uuid.v4() } = event;
	const FSM = getFSM(gameId, playerId);
	FSM.send(<FSMEvent>{ ...event, playerId, websocket });
};
