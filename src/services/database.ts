'use strict';

import Knex from 'knex';
import knexConfigs from '../../knexfile';

interface KnexConfig {
	[key: string]: any;
}

const environment = process.env.NODE_ENV || 'development';
const knexConfig: KnexConfig = (<KnexConfig>knexConfigs)[environment];
const knexInstance: Knex = Knex(knexConfig);

export const getKnex = (): Knex => knexInstance;

export const upsert = async (
	knex: Knex,
	tableName: string,
	conflictTarget: string,
	itemData: any,
	fieldsToPreserveOnConflict: Array<string>,
): Promise<any> => {
	const firstObjectIfArray = Array.isArray(itemData) ? itemData[0] : itemData;
	const fieldsToUpdate = Object.keys(firstObjectIfArray)
		.filter(fieldName => fieldName !== conflictTarget && !fieldsToPreserveOnConflict.includes(fieldName))
		.map(fieldName => knex.raw('?? = EXCLUDED.??', [fieldName, fieldName]).toString())
		.join(',\n');
	const insertString = knex(tableName)
		.insert(itemData)
		.toString();
	const conflictString = knex
		.raw(` ON CONFLICT (??) DO UPDATE SET ${fieldsToUpdate} RETURNING *;`, conflictTarget)
		.toString();
	const query = (insertString + conflictString).replace(/\?/g, '\\?');

	return knex.raw(query).then((result: any) => result.rows);
};
