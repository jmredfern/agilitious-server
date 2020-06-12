'use strict';
const logger = require('../util/logger.js');
const log = logger.getLoggerByFilename({ filename: __filename });
const WebSocket = require('ws');
const inspect = require('util').inspect;

const util = {};

util.sendJSObject = (websocket, object) => {
  if (websocket.readyState === WebSocket.OPEN) {
    try {
      log.info(`Sending object [type:${object.type}} [playerId:${object.playerId}]}`);
      websocket.send(JSON.stringify(object));
    } catch (error) {
      log.info(`Failed to send object due to websocket.send error. [error: ${error}]`);
    }
  } else {
    log.info(`Failed to send object due to websocket not open. [object: ${object}]`);
  }
}

module.exports = util;
