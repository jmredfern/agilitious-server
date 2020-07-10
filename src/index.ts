'use strict';

import { inspect } from 'util';
import { Logger } from 'log4js';
import * as client from './client';
import * as server from './server';
import commandLineArgs from 'command-line-args';
import logger from './util/logger';

const log: Logger = logger.getLoggerByFilename(__filename);
inspect.defaultOptions = { depth: 16, compact: false, breakLength: Infinity };

const optionDefinitions = [
  { name: 'client', alias: 'c', type: Boolean },
  { name: 'gameId', alias: 'g', type: String },
  { name: 'playerId', alias: 'i', type: String },
  { name: 'port', alias: 'p', type: Number },
  { name: 'server', alias: 's', type: Boolean },
  { name: 'websocketUrl', alias: 'w', type: String },
];

const options = commandLineArgs(optionDefinitions);
const { gameId, playerId, port, websocketUrl } = options;

if (options.client) {
  if (!websocketUrl) {
    log.info('No websocket url specified');
    process.exit(0);
  }
  client.start(gameId, playerId, websocketUrl);
} else if (options.server) {
  server.start(process.env.PORT || port);
}

export default {};
