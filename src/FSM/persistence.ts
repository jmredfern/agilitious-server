'use strict';

import { cloneDeep } from 'lodash/fp';
import safeJsonStringify from 'safe-json-stringify';
import WebSocket from 'ws';
import { State } from 'xstate';
import * as FSMStateDAO from '../DAO/FSMState';
import { FSMState, FSMStateConfig, Player, UUID } from '../types';
import { getPhase } from '../util/state';
import { createMachine } from './machine';

const transitionStateToPersisted = (state: any) => {
	const { gameId, gameOwnerId } = state.context;
	const machine = createMachine(gameId, gameOwnerId);
	return machine.transition(state, 'PERSIST');
};

export const persistState = async (state: any) => {
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

export const getPersistedState = async (gameId: UUID) => {
	const FSMStateEntity = await FSMStateDAO.getFSMState(gameId);
	if (!FSMStateEntity) {
		return undefined;
	}
	const state: FSMState = State.create(<FSMStateConfig>(<unknown>FSMStateEntity.json));
	return state;
};
