'use strict';

const logger = require('../util/logger.js');
const log = logger.getLoggerByFilename({ filename: __filename });
const inspect = require('util').inspect;
const { getIssues } = require('./issueStore.js');
const { Machine, interpret } = require('xstate');
const hardCodedIssues = require('../../data/issuesSmall.json');
const { validateFibonacciNumber } = require('../util/points.js');
const {
  getNewActivePlayerId,
  getPlayer,
  getPlayerIndex,
  isEveryoneFinished,
} = require('../util/player.js');
const {
  sendGameState,
  sendIssueClosed,
  sendIssueOpened,
  sendPlayerAdded,
  sendUpdatedPoints,
  sendMoveConfirmed,
  sendPlayerSkipped,
} = require('./clientEvents');

const FSMs = {};

const isActivePlayerGuard = (context, event) => {
  const { activePlayerId } = context;
  const result = activePlayerId && activePlayerId === event.playerId;
  if (!result) {
    const { type, id, playerId } = event;
    log.info('Illegal move attempted by non-active player: ' +
      `event: [type: ${type}, id: ${id}], playerId: ${playerId}`);
  }
  return result;
}

const createGameFSM = ({ gameId, gameOwnerId }) => {
  const gameMachine = Machine(
    {
      context: {
        gameId,
        issues: getIssues({ gameId }) || hardCodedIssues.issues,
        gameOwnerId,
        phase: 'PLAYING',
        players: [],
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
              cond: isActivePlayerGuard,
            },
            OPEN_ISSUE: {
              target: 'active',
              actions: ['openIssue'],
              cond: isActivePlayerGuard,
            },
            CLOSE_ISSUE: {
              target: 'active',
              actions: ['closeIssue'],
              cond: isActivePlayerGuard,
            },
            CONFIRM_MOVE: {
              target: 'active',
              actions: ['confirmMove'],
              cond: isActivePlayerGuard,
            },
            NO_CHANGE: {
              target: 'active',
              actions: ['noChange'],
              cond: isActivePlayerGuard,
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
          const { name, playerId, websocket } = event;
          const player = { name, playerId, websocket };
          const playerIndex = getPlayerIndex({ players, playerId });
          if (playerIndex !== -1) {
            players[playerIndex] = player;
          } else {
            players.push(player);
          }
          if (players.length === 1) {
            context.activePlayerId = playerId;
          }
          sendGameState({ context, eventByPlayerId: playerId });
          sendPlayerAdded({ context, eventByPlayerId: playerId });
        },
        updatePoints: (context, event) => {
          const { issues } = context;
          const { issueId, playerId, points } = event;
          if (!validateFibonacciNumber(points)) {
            log.warn(`Tried to update story points with non fibonacci number!! [event:${inspect(event)}]`);
            return;
          }
          const issue = issues.find(({ id }) => id === issueId);
          if (issue) {
            issue.currentPoints = points;
          } else {
            log.warn(`Issue not found while trying to update points. [issueId:${issueId}]`);
            return;
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
        confirmMove: (context, event) => {
          const { players } = context;
          const { playerId } = event;
          const player = getPlayer({ players, playerId });
          player.finished = false;
          context.activePlayerId = getNewActivePlayerId(context);
          sendMoveConfirmed({ context, eventByPlayerId: playerId });
        },
        noChange: (context, event) => {
          const { players } = context;
          const { playerId } = event;
          const player = getPlayer({ players, playerId });
          player.finished = true;
          context.activePlayerId = getNewActivePlayerId(context);
          if (isEveryoneFinished(players)) {
            context.phase = 'FINISHED';
          }
          sendPlayerSkipped({ context, eventByPlayerId: playerId });
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
