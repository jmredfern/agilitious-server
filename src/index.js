'use strict';

const client = require('./client.js');
const commandLineArgs = require('command-line-args');
const server = require('./server.js');
const logger = require ('./util/logger.js');
const inspect = require('util').inspect;
inspect.defaultOptions = { depth: 16, compact: false, breakLength: Infinity };

const log = logger.getLoggerByFilename({ filename: __filename });

const optionDefinitions = [
  { name: 'antiIdleUrl', alias: 'a', type: String },
  { name: 'client', alias: 'c', type: Boolean },
  { name: 'keyToPress', alias: 'k', type: String },
  { name: 'port', alias: 'p', type: Number },
  { name: 'server', alias: 's', type: Boolean },
  { name: 'serverUrl', alias: 'u', type: String },
  { name: 'sleepLengthMins', alias: 'l', type: Number },
  { name: 'sleepTime', alias: 't', type: String },
  { name: 'websocketUrl', alias: 'w', type: String },
];

const options = commandLineArgs(optionDefinitions);
const { antiIdleUrl, keyToPress, port, serverUrl, sleepLengthMins, sleepTime, websocketUrl } = options;

if (options.client) {
  if (!websocketUrl) {
    log.info('No websocket url specified');
    process.exit(0);
  }
  client.start({ antiIdleUrl, keyToPress, sleepLengthMins, sleepTime, websocketUrl });
} else if (options.server) {
  server.start({ port: process.env.PORT || port, serverUrl });
}
