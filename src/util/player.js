'use strict';

const logger = require('../util/logger.js');
const log = logger.getLoggerByFilename({ filename: __filename });
const WebSocket = require('ws');

const util = {};

util.getPlayerIndex = ({ players, playerId }) => {
	return players.findIndex(({ playerId: id }) => playerId === id);
};

util.getPlayer = ({ players, playerId }) => {
  const playerIndex = players.findIndex(({ playerId: id }) => playerId === id);
  return players[playerIndex];
};

util.isPlayerConnected = player => {
  const { websocket } = player;
  return websocket.readyState === WebSocket.OPEN; // possible options are CONNECTING, OPEN, CLOSING or CLOSED
};

util.getNewActivePlayerId = ({ activePlayerId, newPlayerId, players }) => {
  const playerIndex = util.getPlayerIndex({ players, playerId: newPlayerId || activePlayerId });
  let newPlayer;
  if (playerIndex === players.length - 1) {
    newPlayer = players[0];
  } else {
    newPlayer = players[playerIndex + 1];
  }
  if (newPlayer.playerId === activePlayerId) {
    log.info('No new active player found');
    return activePlayerId;
  } 
  if (util.isPlayerConnected(newPlayer)) {
    return newPlayer.playerId;
  } else {
    return util.getNewActivePlayerId({ currentActivePlayerId: activePlayerId, newPlayer: newPlayer.playerId, players });
  }
};

util.isEveryoneFinished = players => {
  const finishedCount = players.reduce((output, { finished }) => {
    output += finished ? 1 : 0;
    return output;
  }, 0);
  return finishedCount === players.length;
};

module.exports = util;
