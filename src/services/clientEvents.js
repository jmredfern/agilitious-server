'use strict';

const logger = require('../util/logger.js');
const WebSocket = require('ws');
const { sendJSObject } = require('../util/websocket');

const log = logger.getLoggerByFilename({ filename: __filename });

const getPlayersState = players => {
  return Object.values(players).map(({ playerId, playerOrder, websocket }) => ({
    id: playerId,
    connected: websocket.readyState === WebSocket.OPEN, // possible options are CONNECTING, OPEN, CLOSING or CLOSED
    playerOrder,
  }));
};

const service = {};

service.sendGameState = ({ context, eventByPlayerId }) => {
  const { activePlayerId, gameId, issues, gameOwnerId, players } = context;
  const { playerId, websocket } = players[eventByPlayerId];
  sendJSObject(websocket, {
    type: 'GAME_STATE',
    activePlayerId,
    eventByPlayerId,
    gameId,
    gameOwnerId,
    issues,
    phase: 0, // TODO
    playerId,
    players: getPlayersState(players),
  });
};

service.sendPlayerAdded = ({ context, eventByPlayerId }) => {
  const { activePlayerId, gameId, gameOwnerId, players } = context;
  Object.values(players).forEach(({ playerId, websocket }) => {
    if (playerId !== eventByPlayerId) {
      sendJSObject(websocket, {
        type: 'PLAYER_ADDED',
        activePlayerId,
        eventByPlayerId,
        gameId,
        gameOwnerId,
        phase: 0, // TODO
        playerId,
        players: getPlayersState(players),
      });      
    }
  });
};

service.sendUpdatedPoints = ({ context, issue, eventByPlayerId }) => {
  const { activePlayerId, gameId, players } = context;
  Object.values(players).forEach(({ playerId, websocket }) => {
    sendJSObject(websocket, {
      type: 'UPDATED_POINTS',
      activePlayerId,
      eventByPlayerId,
      gameId,
      issue,
      playerId,
      players: getPlayersState(players),
    });
  });
};

service.sendIssueOpened = ({ context, issueId, eventByPlayerId }) => {
  const { activePlayerId, gameId, players } = context;
  Object.values(players).forEach(({ playerId, websocket }) => {
    sendJSObject(websocket, {
      type: 'ISSUE_OPENED',
      activePlayerId,
      eventByPlayerId,
      gameId,
      issueId,
      playerId,
      players: getPlayersState(players),
    });
  });
};

service.sendIssueClosed = ({ context, issueId, eventByPlayerId }) => {
  const { activePlayerId, gameId, players } = context;
  Object.values(players).forEach(({ playerId, websocket }) => {
    sendJSObject(websocket, {
      type: 'ISSUE_CLOSED',
      activePlayerId,
      eventByPlayerId,
      gameId,
      playerId,
      players: getPlayersState(players),
      issueId,
    });
  });
};

module.exports = service;
