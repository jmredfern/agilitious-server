'use strict';

import WebSocket from 'ws';
import { getLoggerByFilename } from '../util/logger';
import { clearIssues, getIssues } from '../services/issueStore';
import { Machine, interpret, State } from 'xstate';
import hardCodedIssues from '../../data/issuesSmall.json';
import { Logger } from 'log4js';
import {
	isPlayersTurn,
	areOtherPlayersDone,
	isOnlyConnectedPlayer,
	noConnectedPlayers,
	allPlayersConnected,
	oneOrMoreConnectedPlayers,
} from './guards';
import actions from './actions';
import * as uuid from 'uuid';
import {
	UUID,
	FSMContext,
	ClientEvent,
	Player,
	FSMStateSchema,
	FSMEvent,
	ConfirmMoveEvent,
	NoChangeClientEvent,
	FSM,
	FSMState,
	FSMStateMachine,
	FSMStateConfig,
	FSMWebSocket,
} from '../types';
import * as FSMStateDAO from '../DAO/FSMState';
import safeJsonStringify from 'safe-json-stringify';
import { sendEvent } from '../util/websocket';
import { cloneDeep } from 'lodash/fp';
import { Mutex, withTimeout } from 'async-mutex';
import { getPhase } from '../util/state';

const log: Logger = getLoggerByFilename(__filename);

const FSMServices: { [key: string]: FSM } = {};
const mutexes: { [key: string]: Mutex } = {};

const createMachine = (gameId: UUID, gameOwnerId: UUID): FSMStateMachine => {
	return Machine<FSMContext, FSMStateSchema, FSMEvent>(
		{
			context: <FSMContext>{
				gameId,
				issues: getIssues(gameId) || hardCodedIssues.issues,
				gameOwnerId,
				players: <Array<Player>>[],
				ephemeral: {},
			},
			id: 'GAME',
			initial: 'ACTIVE',
			states: {
				ACTIVE: {
					initial: 'START',
					states: {
						START: {
							on: {
								CREATE_GAME: {
									target: 'PLAYING',
									actions: ['createGame'],
								},
								PERSIST: {
									target: '#GAME.PERSISTED',
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
										cond: (context: FSMContext, event: ConfirmMoveEvent) => {
											return (
												isPlayersTurn(context, event) && !isOnlyConnectedPlayer(context, event)
											);
										},
									},
									{
										target: 'FINISHED',
										actions: ['confirmMove'],
										cond: (context: FSMContext, event: ConfirmMoveEvent) => {
											return (
												isPlayersTurn(context, event) && isOnlyConnectedPlayer(context, event)
											);
										},
									},
								],
								NO_CHANGE: [
									{
										target: 'PLAYING',
										actions: ['noChange'],
										cond: (context: FSMContext, event: NoChangeClientEvent) => {
											return (
												isPlayersTurn(context, event) && !areOtherPlayersDone(context, event)
											);
										},
									},
									{
										target: 'FINISHED',
										actions: ['noChange'],
										cond: (context: FSMContext, event: NoChangeClientEvent) => {
											return isPlayersTurn(context, event) && areOtherPlayersDone(context, event);
										},
									},
								],
								PLAYER_DISCONNECT: {
									target: 'PLAYING',
									actions: ['playerDisconnect'],
								},
								PERSIST: {
									target: '#GAME.PERSISTED',
								},
							},
						},
						FINISHED: {
							entry: ['scheduleCleanup'],
							type: 'final',
						},
						HISTORY: {
							type: 'history',
						},
					},
				},
				PERSISTED: {
					on: {
						JOIN_GAME: [
							{
								target: 'PERSISTED',
								actions: ['addPlayer', 'scheduleActivate', 'activateIfAllPlayersConnected'],
								cond: noConnectedPlayers,
							},
							{
								target: 'PERSISTED',
								actions: ['addPlayer', 'activateIfAllPlayersConnected'],
								cond: oneOrMoreConnectedPlayers,
							},
						],
						ACTIVATE: {
							target: 'ACTIVE.HISTORY',
							actions: ['activateGame'],
						},
					},
				},
			},
		},
		{
			actions: {
				...actions,
				activateIfAllPlayersConnected,
				scheduleActivate,
				scheduleCleanup,
			},
		},
	);
};

const activateGame = (gameId: UUID) => {
	const fsmService = FSMServices[gameId];
	if (fsmService) {
		fsmService.send(<FSMEvent>{
			id: <UUID>uuid.v4(),
			gameId: gameId,
			type: 'ACTIVATE',
		});
	}
};

const scheduleActivate = async (context: FSMContext, event: FSMEvent): Promise<void> => {
	const activateDelayMs = 5000;
	if (context.ephemeral.cancelScheduledActivate) {
		// scheduler already activated
		return;
	}
	const { gameId } = context;
	const cancelScheduledActivate = setTimeout(async () => {
		activateGame(gameId);
		log.info(
			`Executed scheduled re-activation, gameId: ${gameId}, event ${event.type} ${event.id} playerId ${event.playerId}`,
		);
	}, activateDelayMs);
	context.ephemeral.cancelScheduledActivate = cancelScheduledActivate;
	log.info(`Scheduled re-activation, gameId: ${gameId}, event ${event.type} ${event.id} playerId ${event.playerId}`);
};

const scheduleCleanup = async (context: FSMContext, event: FSMEvent): Promise<void> => {
	const cleanupDelayHours = 8;
	const cleanupDelayMs = cleanupDelayHours * 60 * 60 * 1000;
	setTimeout(async () => {
		const { gameId } = context;
		clearIssues(gameId);
		delete FSMServices[gameId];
		delete mutexes[gameId];
		await FSMStateDAO.deleteFSMState(gameId);
		log.info(
			`Executed scheduled clean up, gameId: ${gameId}, event ${event.type} ${event.id} playerId ${event.playerId}`,
		);
	}, cleanupDelayMs);
};

const activateIfAllPlayersConnected = (context: FSMContext, event: FSMEvent): void => {
	const { gameId } = context;
	if (allPlayersConnected(context)) {
		if (context.ephemeral.cancelScheduledActivate) {
			clearTimeout(context.ephemeral.cancelScheduledActivate);
			delete context.ephemeral.cancelScheduledActivate;
			log.info(
				`Clearing scheduled re-activation, gameId: ${gameId}, event ${event.type} ${event.id} playerId ${event.playerId}`,
			);
		}
		activateGame(gameId);
		log.info(
			`All players have reconnected, game activated gameId: ${gameId}, event ${event.type} ${event.id} playerId ${event.playerId}`,
		);
	}
};

const acquireGetFSMServiceMutex = async (gameId: UUID) => {
	if (mutexes[gameId]) {
		return await mutexes[gameId].acquire();
	}
	const getFSMServiceMutexTimeoutMs = 5000;
	const mutexWithTimeout = <any>(
		withTimeout(new Mutex(), getFSMServiceMutexTimeoutMs, new Error('getFSMServiceMutex timeout'))
	);
	mutexes[gameId] = mutexWithTimeout;
	return await mutexes[gameId].acquire();
};

const getFSMService = async (gameId: UUID, playerId: UUID, allowCreateFSM: boolean): Promise<FSM | undefined> => {
	const releaseMutex = await acquireGetFSMServiceMutex(gameId);
	try {
		if (!FSMServices[gameId]) {
			const persistedState = await getPersistedState(gameId);
			if (persistedState || allowCreateFSM) {
				const gameOwnerId = playerId;
				const machine = createMachine(gameId, gameOwnerId);
				const service = interpret(machine).onTransition(persistState);
				FSMServices[gameId] = service;
				if (persistedState) {
					log.info(`Restoring FSMService gameId ${gameId}, playerId ${playerId}`);
					const state = machine.resolveState(persistedState);
					service.start(state);
				} else {
					service.start();
				}
			}
		}
	} finally {
		releaseMutex();
		delete mutexes[gameId];
	}

	return FSMServices[gameId];
};

export const processPlayerEvent = async (event: ClientEvent, websocket: FSMWebSocket): Promise<void> => {
	const { gameId = <UUID>uuid.v4(), playerId = <UUID>uuid.v4(), type, id } = event;
	log.info(`Processing player event ${type},  playerId ${playerId}, eventId ${id}, gameId ${gameId}`);
	const allowCreateFSM: boolean = type === 'CREATE_GAME';
	const fsmService = await getFSMService(gameId, playerId, allowCreateFSM);
	if (fsmService) {
		fsmService.send(<FSMEvent>{ ...event, playerId, websocket });
	} else {
		sendEvent(websocket, {
			type: 'FSM_NOT_FOUND',
			id: <UUID>uuid.v4(),
		});
	}
};

export const processPlayerDisconnect = (websocket: FSMWebSocket): void => {
	const fsmService = FSMServices[<UUID>websocket.gameId];
	if (fsmService) {
		fsmService.send(<FSMEvent>{
			id: <UUID>uuid.v4(),
			gameId: <UUID>websocket.gameId,
			type: 'PLAYER_DISCONNECT',
			playerId: <UUID>websocket.playerId,
			websocket,
		});
	}
};

const transitionStateToPersisted = (state: any) => {
	const { gameId, gameOwnerId } = state.context;
	const machine = createMachine(gameId, gameOwnerId);
	return machine.transition(state, 'PERSIST');
};

const persistState = async (state: any) => {
	const clonedState = cloneDeep(state);
	const transitionedState = transitionStateToPersisted(clonedState);
	transitionedState.context.players.forEach((player: Player) => {
		player.websocket.readyState = WebSocket.CLOSED;
		player.ephemeral = {};
	});
	transitionedState.context.ephemeral = {};
	transitionedState.actions = [];
	const stateAsJson = safeJsonStringify(transitionedState);
	const now = new Date();
	await FSMStateDAO.putFSMState({
		id: state.context.gameId,
		json: stateAsJson,
		phase: getPhase(state.value),
		created_date: now,
		updated_date: now,
	});
};

const getPersistedState = async (gameId: UUID) => {
	const FSMStateEntity = await FSMStateDAO.getFSMState(gameId);
	if (!FSMStateEntity) {
		return undefined;
	}
	const state: FSMState = State.create(<FSMStateConfig>(<unknown>FSMStateEntity.json));
	return state;
};
