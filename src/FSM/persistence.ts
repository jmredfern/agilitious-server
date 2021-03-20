'use strict';

import { cloneDeep } from 'lodash/fp';
import safeJsonStringify from 'safe-json-stringify';
import { State } from 'xstate';
import * as gamesDAO from '../DAO/games';
import { FSMContext, FSMState, FSMStateConfig, Player, UUID } from '../types';
import { getPhase } from '../util/state';
import { createMachine } from './machine';

const transitionStateToPersisted = (state: any) => {
	const { gameId } = state.context;
	const machine = createMachine(gameId);
	const context = <FSMContext>{
		...machine.context,
		gameOwner: state.context.gameOwner,
	};
	return machine.withContext(context).transition(state, 'PERSIST');
};

export const persistState = async (state: any): Promise<any> => {
	const clonedState = cloneDeep(state);
	const transitionedState = transitionStateToPersisted(clonedState);
	transitionedState.context.players.forEach((player: Player) => {
		player.ephemeral = {};
	});
	transitionedState.context.ephemeral = {};
	transitionedState.actions = [];
	const stateAsJson = safeJsonStringify(transitionedState);
	const now = new Date();
	await gamesDAO.putGame({
		id: state.context.gameId,
		fsm_state: stateAsJson,
		phase: getPhase(state.value),
		created_date: now,
		updated_date: now,
	});
};

export const getPersistedState = async (gameId: UUID): Promise<any> => {
	const gameEntity = await gamesDAO.getGame(gameId);
	if (!gameEntity) {
		return undefined;
	}
	const state: FSMState = State.create(<FSMStateConfig>(<unknown>gameEntity.fsm_state));
	return state;
};
