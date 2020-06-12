'use strict';

const logger = require('../util/logger.js');
const WebSocket = require('ws');
const { Machine, interpret } = require('xstate');
const hardCodedIssues = require('../../data/issuesSmall.json');
const { sendJSObject } = require('../util/websocket');

const log = logger.getLoggerByFilename({ filename: __filename });

const FSMs = {};

const getPlayersState = players => {
  return Object.values(players).map(({ playerId, playerOrder, websocket }) => ({
    id: playerId,
    connected: websocket.readyState === WebSocket.OPEN, // possible options are CONNECTING, OPEN, CLOSING or CLOSED
    playerOrder,
  }));
};

const sendGameState = ({ activePlayerId, gameId, issues, gameOwnerId, players }) => {
  Object.values(players).forEach(({ playerId, websocket }) => {
    sendJSObject(websocket, {
      gameState: {
        phase: 0, // TODO
        activePlayerId,
        gameId,
        gameOwnerId,
        playerId,
        players: getPlayersState(players),
        issues,
      },
    });
  });
};

const createGameFSM = ({ gameId, gameOwnerId }) => {
  const gameMachine = Machine(
    {
      context: {
        gameId,
        issues: hardCodedIssues.issues,
        gameOwnerId,
        players: {},
      },
      id: 'gameFSM',
      initial: 'start',
      states: {
        start: {
          on: {
            JOIN_GAME: {
              target: 'active',
              actions: ['addPlayer'],
            },
          }
        },
        active: {
          on: {
            JOIN_GAME: {
              target: 'active',
              actions: ['addPlayer'],
            },
          }
        },
        finish: {
          type: 'final'
        },
      },
    },
    {
      actions: {
        addPlayer: (context, { playerId, websocket }) => {
          const { players } = context;
          const playerOrder = Object.keys(players).length;
          players[playerId] = {
            playerId,
            playerOrder,
            websocket
          };
          if (playerOrder === 0) {
            context.activePlayerId = playerId;
          }
          sendGameState(context);
        }
      },
      activities: {
        /* ... */
      },
      guards: {
        /* ... */
      },
      services: {
        /* ... */
      }
    },
  );
  const gameService = interpret(gameMachine).onTransition(state =>
    log.info(state.value)
  );
  gameService.start();
  return gameService;
}

const service = {};

service.getGameFSM = ({ gameId, playerId }) => {
  if (!FSMs[gameId]) {
    const gameFSM = createGameFSM({
      gameId,
      gameOwnerId: playerId,
    });
    FSMs[gameId] = gameFSM;
  }
  
  return FSMs[gameId];
}

module.exports = service;
