'use strict';

import { getKnex, upsert } from '../services/database';
import { UUID, GameEntity } from 'types';

const knex = getKnex();

export const getGame = async (id: UUID): Promise<GameEntity> => {
	return knex('games').where('id', id).first();
};

export const putGame = async (game: GameEntity): Promise<void> => {
	await upsert(knex, 'games', 'id', game, ['created_date']);
};

export const deleteGame = async (id: UUID): Promise<void> => {
	return knex('games').where('id', id).delete();
};
