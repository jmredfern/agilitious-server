'use strict';

import { Mutex, withTimeout } from 'async-mutex';
import { Logger } from 'log4js';
import * as uuid from 'uuid';
import { interpret } from 'xstate';
import { ClientEvent, FSM, FSMEvent, FSMWebSocket, UUID } from '../types';
import { getLoggerByFilename } from '../util/logger';
import { sendEvent } from '../util/websocket';
import * as fsmStore from '../FSM/fsmStore';
import { createMachine } from '../FSM/machine';
import { getPersistedState, persistState } from '../FSM/persistence';

const log: Logger = getLoggerByFilename(__filename);

const mutexes: { [key: string]: Mutex } = {};

const acquireGetFSMMutex = async (gameId: UUID) => {
	if (!mutexes[gameId]) {
		const getFSMMutexTimeoutMs = 5000;
		const mutexWithTimeout = <any>withTimeout(new Mutex(), getFSMMutexTimeoutMs, new Error('getFSMMutex timeout'));
		mutexes[gameId] = mutexWithTimeout;
	}
	return await mutexes[gameId].acquire();
};

const getFSM = async (gameId: UUID, playerId: UUID, allowCreateFSM: boolean): Promise<FSM | undefined> => {
	const releaseMutex = await acquireGetFSMMutex(gameId);
	try {
		if (!fsmStore.getFSM(gameId)) {
			const persistedState = await getPersistedState(gameId);
			if (persistedState || allowCreateFSM) {
				const gameOwnerId = playerId;
				const machine = createMachine(gameId, gameOwnerId);
				const fsm = interpret(machine).onTransition(persistState);
				fsmStore.setFSM(gameId, fsm);
				if (persistedState) {
					log.info(`Restoring FSM gameId ${gameId}, playerId ${playerId}`);
					const state = machine.resolveState(persistedState);
					fsm.start(state);
				} else {
					fsm.start();
				}
			}
		}
	} finally {
		releaseMutex();
		delete mutexes[gameId];
	}

	return fsmStore.getFSM(gameId);
};

export const processPlayerEvent = async (event: ClientEvent, websocket: FSMWebSocket): Promise<void> => {
	const { gameId = <UUID>uuid.v4(), playerId = <UUID>uuid.v4(), type, id } = event;
	log.info(`Processing player event ${type},  playerId ${playerId}, eventId ${id}, gameId ${gameId}`);
	const allowCreateFSM: boolean = type === 'CREATE_GAME';
	const fsm = await getFSM(gameId, playerId, allowCreateFSM);
	if (fsm) {
		fsm.send(<FSMEvent>{ ...event, playerId, websocket });
	} else {
		sendEvent(websocket, {
			type: 'FSM_NOT_FOUND',
			id: <UUID>uuid.v4(),
		});
	}
};

export const processPlayerDisconnect = (websocket: FSMWebSocket): void => {
	const fsmService = fsmStore.getFSM(<UUID>websocket.gameId);
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
