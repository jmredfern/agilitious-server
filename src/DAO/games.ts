'use strict';

import { getKnex } from '../util/database';
import { UUID, GameEntity } from 'types';

const knex = getKnex();

export const getGame = async (id: UUID): Promise<GameEntity> => {
	return knex('games').where('id', id).first();
};

export const putGame = async (game: GameEntity): Promise<void> => {
	await knex('games').insert(game).onConflict('id').merge(['fsm_state', 'phase', 'updated_date']);
};

export const deleteGame = async (id: UUID): Promise<void> => {
	return knex('games').where('id', id).delete();
};
