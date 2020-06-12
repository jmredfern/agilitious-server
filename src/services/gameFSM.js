'use strict';

const logger = require('../util/logger.js');
const { Machine, interpret } = require('xstate');
const hardCodedIssues = require('../../data/issuesSmall.json');
const {
  sendGameState,
  sendIssueClosed,
  sendIssueOpened,
  sendPlayerAdded,
  sendUpdatedPoints,
} = require('./clientEvents');

const log = logger.getLoggerByFilename({ filename: __filename });

const FSMs = {};

const isActivePlayer = (context, event) => {
  const { activePlayerId } = context;
  return activePlayerId && activePlayerId === event.playerId;
}

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
            UPDATE_POINTS: {
              target: 'active',
              actions: ['updatePoints'],
              cond: isActivePlayer,
            },
            OPEN_ISSUE: {
              target: 'active',
              actions: ['openIssue'],
              cond: isActivePlayer,
            },
            CLOSE_ISSUE: {
              target: 'active',
              actions: ['closeIssue'],
              cond: isActivePlayer,
            },
          },
        },
        finish: {
          type: 'final'
        },
      },
    },
    {
      actions: {
        addPlayer: (context, event) => {
          const { players } = context;
          const { playerId, websocket } = event;
          const playerOrder = Object.keys(players).length;
          players[playerId] = {
            playerId,
            playerOrder,
            websocket
          };
          if (playerOrder === 0) {
            context.activePlayerId = playerId;
          }
          sendGameState({ context, eventByPlayerId: playerId });
          sendPlayerAdded({ context, eventByPlayerId: playerId });
        },
        updatePoints: (context, event) => {
          const { issues } = context;
          const { issueId, playerId, points } = event;
          const issue = issues.find(({ id }) => id === issueId);
          if (issue) {
            issue.currentPoints = points;
          } else {
            log.warn(`Issue not found while trying to update points. [issueId:${issueId}]`);
          }
          sendUpdatedPoints({ context, issue, eventByPlayerId: playerId });
        },
        openIssue: (context, event) => {
          const { issueId, playerId } = event;
          sendIssueOpened({ context, issueId, eventByPlayerId: playerId });
        },
        closeIssue: (context, event) => {
          const { issueId, playerId } = event;
          sendIssueClosed({ context, issueId, eventByPlayerId: playerId });
        },
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
