'use strict';

import { getLoggerByFilename } from '../util/logger';
import { clearIssues, getIssues } from '../services/issueStore';
import { Machine, interpret, State } from 'xstate';
import hardCodedIssues from '../../data/issuesSmall.json';
import { Logger } from 'log4js';
import { isPlayersTurn, areOtherPlayersDone, isOnlyConnectedPlayer } from './guards';
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
import util from 'util';
import * as FSMStateDAO from '../DAO/FSMState';
import safeJsonStringify from 'safe-json-stringify';
import { sendEvent } from '../util/websocket';
import { cloneDeep } from 'lodash/fp';

const log: Logger = getLoggerByFilename(__filename);
const setTimeoutAsync = util.promisify(setTimeout);

const FSMServices: { [key: string]: FSM } = {};

const createMachine = (gameId: UUID, gameOwnerId: UUID): FSMStateMachine => {
	return Machine<FSMContext, FSMStateSchema, FSMEvent>(
		{
			context: <FSMContext>{
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
								cond: (context: FSMContext, event: ConfirmMoveEvent) => {
									return isPlayersTurn(context, event) && !isOnlyConnectedPlayer(context, event);
								},
							},
							{
								target: 'FINISHED',
								actions: ['confirmMove'],
								cond: (context: FSMContext, event: ConfirmMoveEvent) => {
									return isPlayersTurn(context, event) && isOnlyConnectedPlayer(context, event);
								},
							},
						],
						NO_CHANGE: [
							{
								target: 'PLAYING',
								actions: ['noChange'],
								cond: (context: FSMContext, event: NoChangeClientEvent) => {
									return isPlayersTurn(context, event) && !areOtherPlayersDone(context, event);
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
						PLAYER_DISCONNECT: [
							{
								target: 'PLAYING',
								actions: ['playerDisconnect'],
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

const scheduleCleanup = async (context: FSMContext): Promise<void> => {
	const cleanupDelayHours = 8;
	const cleanupDelayMs = cleanupDelayHours * 60 * 60 * 1000;
	await setTimeoutAsync(cleanupDelayMs);
	const { gameId } = context;
	clearIssues(gameId);
	delete FSMServices[gameId];
	await FSMStateDAO.deleteFSMState(gameId);
	log.info(`Cleaning up gameId: ${gameId}`);
};

const getFSMService = async (gameId: UUID, playerId: UUID, allowCreateFSM: boolean): Promise<FSM | undefined> => {
	if (!FSMServices[gameId]) {
		const persistedState = await getPersistedState(gameId);
		if (!persistedState && !allowCreateFSM) {
			return;
		}
		const gameOwnerId = playerId;
		const machine = createMachine(gameId, gameOwnerId);
		const service = interpret(machine).onTransition(persistState);
		if (persistedState) {
			const state = machine.resolveState(persistedState);
			service.start(state);
		} else {
			service.start();
		}
		FSMServices[gameId] = service;
	}

	return FSMServices[gameId];
};

export const processPlayerEvent = async (event: ClientEvent, websocket: FSMWebSocket): Promise<void> => {
	const { gameId = <UUID>uuid.v4(), playerId = <UUID>uuid.v4(), type } = event;
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

const persistState = async (state: any) => {
	const { context, history, historyValue, value, _event } = state;
	const contextClone: any = cloneDeep(context);
	contextClone.players = [];
	const stateAsJson = safeJsonStringify({
		_event,
		value,
		context: contextClone,
		history,
		historyValue,
	});
	const now = new Date();
	await FSMStateDAO.putFSMState({
		id: state.context.gameId,
		json: stateAsJson,
		current_state: <string>state.value,
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
