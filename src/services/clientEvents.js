'use strict';

const logger = require('../util/logger.js');
const log = logger.getLoggerByFilename({ filename: __filename });
const WebSocket = require('ws');
const { sendJSObject } = require('../util/websocket');
const { getPlayerIndex, isPlayerConnected } = require('../util/player.js');

const getPlayersState = players => {
  return players.map(player => {
    const { name, playerId } = player;
    return {
      connected: isPlayerConnected(player),
      id: playerId,
      name,
    };
  });
};

const service = {};

service.sendGameState = ({ context, eventByPlayerId }) => {
  const { activePlayerId, gameId, issues, gameOwnerId, phase, players } = context;
  const playerIndex = getPlayerIndex({ players, playerId: eventByPlayerId });
  const { playerId, websocket } = players[playerIndex];
  sendJSObject(websocket, {
    type: 'GAME_STATE',
    activePlayerId,
    eventByPlayerId,
    gameId,
    gameOwnerId,
    issues,
    phase,
    playerId,
    players: getPlayersState(players),
  });
};

service.sendPlayerAdded = ({ context, eventByPlayerId }) => {
  const { gameId, gameOwnerId, players } = context;
  players.forEach(({ playerId, websocket }) => {
    if (playerId !== eventByPlayerId) {
      sendJSObject(websocket, {
        type: 'PLAYER_ADDED',
        eventByPlayerId,
        gameId,
        gameOwnerId,
        playerId,
        players: getPlayersState(players),
      });      
    }
  });
};

service.sendUpdatedPoints = ({ context, issue, eventByPlayerId }) => {
  const { gameId, players } = context;
  players.forEach(({ playerId, websocket }) => {
    sendJSObject(websocket, {
      type: 'UPDATED_POINTS',
      eventByPlayerId,
      gameId,
      issue,
      playerId,
      players: getPlayersState(players),
    });
  });
};

service.sendIssueOpened = ({ context, issueId, eventByPlayerId }) => {
  const { gameId, players } = context;
  players.forEach(({ playerId, websocket }) => {
    sendJSObject(websocket, {
      type: 'ISSUE_OPENED',
      eventByPlayerId,
      gameId,
      issueId,
      playerId,
      players: getPlayersState(players),
    });
  });
};

service.sendIssueClosed = ({ context, issueId, eventByPlayerId }) => {
  const { gameId, players } = context;
  players.forEach(({ playerId, websocket }) => {
    sendJSObject(websocket, {
      type: 'ISSUE_CLOSED',
      eventByPlayerId,
      gameId,
      playerId,
      players: getPlayersState(players),
      issueId,
    });
  });
};

service.sendMoveConfirmed = ({ context, eventByPlayerId }) => {
  const { activePlayerId, gameId, players } = context;
  players.forEach(({ playerId, websocket }) => {
    sendJSObject(websocket, {
      type: 'MOVE_CONFIRMED',
      activePlayerId,
      eventByPlayerId,
      gameId,
      playerId,
      players: getPlayersState(players),
    });
  });
};

service.sendPlayerSkipped = ({ context, eventByPlayerId }) => {
  const { activePlayerId, gameId, phase, players } = context;
  players.forEach(({ playerId, websocket }) => {
    sendJSObject(websocket, {
      type: 'PLAYER_SKIPPED',
      activePlayerId,
      eventByPlayerId,
      gameId,
      phase,
      playerId,
      players: getPlayersState(players),
    });
  });
};

module.exports = service;
