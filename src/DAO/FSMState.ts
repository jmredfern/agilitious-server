'use strict';

import { getKnex, upsert } from '../services/database';
import { UUID, FSMStateEntity } from 'types';

const knex = getKnex();

export const getFSMState = async (id: UUID): Promise<FSMStateEntity> => {
	return knex('fsm_state')
		.where('id', id)
		.first();
};

export const putFSMState = async (stateMachine: FSMStateEntity): Promise<void> => {
	await upsert(knex, 'fsm_state', 'id', stateMachine, ['created_date']);
};

export const deleteFSMState = async (id: UUID): Promise<void> => {
	return knex('fsm_state')
		.where('id', id)
		.delete();
};
