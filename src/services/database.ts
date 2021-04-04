'use strict';

import { knex, Knex } from 'knex';
import knexConfigs from '../../knexfile';

interface KnexConfig {
	[key: string]: any;
}

const environment = process.env.NODE_ENV || 'development';
const knexConfig: KnexConfig = (<KnexConfig>knexConfigs)[environment];
const _knexInstance: Knex = knex(knexConfig);

export const getKnex = (): Knex => _knexInstance;
