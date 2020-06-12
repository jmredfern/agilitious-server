'use strict';

const client = require('./client.js');
const commandLineArgs = require('command-line-args');
const server = require('./server.js');
const logger = require ('./util/logger.js');
const inspect = require('util').inspect;
inspect.defaultOptions = { depth: 16, compact: false, breakLength: Infinity };

const log = logger.getLoggerByFilename({ filename: __filename });

const optionDefinitions = [
  { name: 'client', alias: 'c', type: Boolean },
  { name: 'port', alias: 'p', type: Number },
  { name: 'server', alias: 's', type: Boolean },
  { name: 'serverUrl', alias: 'u', type: String },
  { name: 'websocketUrl', alias: 'w', type: String },
  { name: 'playerId', alias: 'i', type: String },
  { name: 'gameId', alias: 'g', type: String },
];

const options = commandLineArgs(optionDefinitions);
const { gameId, playerId, port, serverUrl, websocketUrl } = options;

if (options.client) {
  if (!websocketUrl) {
    log.info('No websocket url specified');
    process.exit(0);
  }
  client.start({ gameId, playerId, websocketUrl });
} else if (options.server) {
  server.start({ port: process.env.PORT || port, serverUrl });
}
