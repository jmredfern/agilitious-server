'use strict';

import { Mutex, withTimeout } from 'async-mutex';
import { Logger } from 'log4js';
import * as uuid from 'uuid';
import { interpret } from 'xstate';
import {
	ClientEvent,
	CreateGameClientEvent,
	FSM,
	FSMEvent,
	FSMWebSocket,
	GameOwner,
	UUID,
	FSMContext,
	FSMState,
} from '../types';
import { getLoggerByFilename } from '../util/logger';
import { sendEvent } from '../util/websocket';
import * as fsmStore from '../FSM/fsmStore';
import { createMachine } from '../FSM/machine';
import { getPersistedState, persistState } from '../FSM/persistence';
import { storeAPIRequestIssues } from './issueStore';
import { getIssuesFromJira } from './jiraService';
import { inspect } from 'util';

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

const retrieveAndStoreJiraIssues = async (gameId: UUID, playerId: UUID, event: ClientEvent): Promise<void> => {
	const gameOwner = getGameOwner(gameId, playerId, event as CreateGameClientEvent);
	const { jiraCompanyName, jiraProjectId, jiraEmail, jiraAPIToken } = gameOwner;
	const issues = await getIssuesFromJira(jiraCompanyName, jiraProjectId, jiraEmail, jiraAPIToken);
	storeAPIRequestIssues(gameOwner.gameId, issues);
};

const logTransition = (state: any): any => {
	const { gameId } = state.context;
	log.info(`FSM transition: gameId ${gameId}, new state ${inspect(state.value)}`);
};

const createFSM = (event: ClientEvent) => {
	const { gameId = <UUID>uuid.v4(), playerId = <UUID>uuid.v4() } = event;
	log.info(`Creating FSM gameId ${gameId}, playerId ${playerId}`);

	const machine = createMachine(gameId);
	const initialContext = <FSMContext>{
		...machine.context,
		gameOwner: getGameOwner(gameId, playerId, event as CreateGameClientEvent),
	};
	const fsm = interpret(machine.withContext(initialContext)).onTransition(persistState).onTransition(logTransition);
	fsmStore.setFSM(gameId, fsm);
	fsm.start();
};

const restoreFSM = (event: ClientEvent, persistedState: FSMState) => {
	const { gameId = <UUID>uuid.v4(), playerId = <UUID>uuid.v4() } = event;
	log.info(`Restoring FSM gameId ${gameId}, playerId ${playerId}`);

	const machine = createMachine(gameId);
	const fsm = interpret(machine).onTransition(persistState).onTransition(logTransition);
	fsmStore.setFSM(gameId, fsm);
	const state = machine.resolveState(persistedState);
	fsm.start(state);
};

const getFSM = async (event: ClientEvent): Promise<FSM | undefined> => {
	const { gameId = <UUID>uuid.v4(), playerId = <UUID>uuid.v4(), type: clientEventType } = event;

	const releaseMutex = await acquireGetFSMMutex(gameId);
	try {
		if (fsmStore.getFSM(gameId)) {
			log.info(`Found FSM gameId ${gameId}, playerId ${playerId}`);
		} else {
			if (clientEventType === 'CREATE_GAME') {
				createFSM(event);
			} else {
				const persistedState = await getPersistedState(gameId);
				if (persistedState) {
					restoreFSM(event, persistedState);
				}
			}
		}
	} finally {
		releaseMutex();
		delete mutexes[gameId];
	}

	return fsmStore.getFSM(gameId);
};

const getGameOwner = (gameId: UUID, playerId: UUID, event: CreateGameClientEvent): GameOwner => ({
	gameId,
	playerId,
	jiraAPIToken: event.jiraAPIToken || `${process.env.JIRA_API_TOKEN}`,
	jiraCompanyName: event.jiraCompanyName || `${process.env.JIRA_COMPANY_NAME}`,
	jiraEmail: event.jiraEmail || `${process.env.JIRA_EMAIL}`,
	jiraProjectId: event.jiraProjectId || `${process.env.JIRA_PROJECT_ID}`,
});

export const processPlayerEvent = async (event: ClientEvent, websocket: FSMWebSocket): Promise<void> => {
	const { gameId = <UUID>uuid.v4(), playerId = <UUID>uuid.v4(), type: clientEventType, id } = event;
	log.info(`Processing player event ${clientEventType},  playerId ${playerId}, eventId ${id}, gameId ${gameId}`);

	if (clientEventType === 'CREATE_GAME') {
		await retrieveAndStoreJiraIssues(gameId, playerId, event);
	}

	const fsm = await getFSM(event);

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
