'use strict';

import { inspect } from 'util';
import * as server from './server';
import commandLineArgs from 'command-line-args';
import axios from 'axios';
import { Logger } from 'log4js';
import { getLoggerByFilename } from './util/logger';
import { watchMemoryStats } from './util/memwatch';

const log: Logger = getLoggerByFilename(__filename);

inspect.defaultOptions = { depth: 16, compact: false, breakLength: Infinity, maxStringLength: 128 };

const optionDefinitions = [{ name: 'port', alias: 'p', type: Number }];

const options = commandLineArgs(optionDefinitions);
const { port } = options;

axios.interceptors.response.use(
	(response) => response,
	(error) => {
		log.error(error.response.data);
		throw error;
	},
);

watchMemoryStats();

server.start(process.env.PORT || port);

export default {};
