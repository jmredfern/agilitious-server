'use strict';

const WebSocket = require('ws');

const util = {};

util.getPlayerIndex = ({ players, playerIdToFind }) => {
	return players.findIndex(({ playerId }) => playerId === playerIdToFind);
};

// util.getPlayer = ({ players, playerIdToFind }) => {
//   const playerIndex = players.findIndex(({ playerId }) => playerId === playerIdToFind);
//   return players[playerIndex];
// };

util.isPlayerConnected = player => {
  const { websocket } = player;
  return websocket.readyState === WebSocket.OPEN; // possible options are CONNECTING, OPEN, CLOSING or CLOSED
};

util.getNewActivePlayerId = ({ activePlayerId, newPlayerId, players }) => {
  const playerIndex = util.getPlayerIndex({ players, playerIdToFind: newPlayerId || activePlayerId });
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

module.exports = util;
