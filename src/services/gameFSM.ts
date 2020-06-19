'use strict';

import logger from '../util/logger';
import { inspect } from 'util';
import { getIssues } from './issueStore';
import { Machine, interpret }  from 'xstate';
import hardCodedIssues from '../../data/issuesSmall.json';
import { validateFibonacciNumber } from '../util/points';
import {
  getNewActivePlayerId,
  getPlayer,
  getPlayerIndex,
  isEveryoneFinished,
} from '../util/player';
import {
  sendGameState,
  sendIssueClosed,
  sendIssueOpened,
  sendPlayerAdded,
  sendUpdatedPoints,
  sendMoveConfirmed,
  sendPlayerSkipped,
} from './clientEvents';
import { Issue } from '../types';

const log = logger.getLoggerByFilename({ filename: __filename });

const FSMs: { [key: string]: any } = {};

const isActivePlayerGuard = (context: any, event: any) => {
  const { activePlayerId } = context;
  const result = activePlayerId && activePlayerId === event.playerId;
  if (!result) {
    const { type, id, playerId } = event;
    log.info('Illegal move attempted by non-active player: ' +
      `event: [type: ${type}, id: ${id}], playerId: ${playerId}`);
  }
  return result;
}

const createGameFSM = ({ gameId, gameOwnerId }: { gameId: string, gameOwnerId: string }): any => {
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
        addPlayer: (context: any, event: any) => {
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
        updatePoints: (context: any, event: any) => {
          const { issues } = context;
          const { issueId, playerId, points } = event;
          if (!validateFibonacciNumber(points)) {
            log.warn(`Tried to update story points with non fibonacci number!! [event:${inspect(event)}]`);
            return;
          }
          const issue = issues.find(({ id }: Issue): boolean => id === issueId);
          if (issue) {
            issue.currentPoints = points;
          } else {
            log.warn(`Issue not found while trying to update points. [issueId:${issueId}]`);
            return;
          }
          sendUpdatedPoints({ context, issue, eventByPlayerId: playerId });
        },
        openIssue: (context: any, event: any) => {
          const { issueId, playerId } = event;
          sendIssueOpened({ context, issueId, eventByPlayerId: playerId });
        },
        closeIssue: (context: any, event: any) => {
          const { issueId, playerId } = event;
          sendIssueClosed({ context, issueId, eventByPlayerId: playerId });
        },
        confirmMove: (context: any, event: any) => {
          const { players } = context;
          const { playerId } = event;
          const player = getPlayer({ players, playerId });
          player.finished = false;
          context.activePlayerId = getNewActivePlayerId(context);
          sendMoveConfirmed({ context, eventByPlayerId: playerId });
        },
        noChange: (context: any, event: any) => {
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

export const getGameFSM = ({ gameId, playerId }: { gameId: string, playerId: string }): any  => {
  if (!FSMs[gameId]) {
    const gameFSM = createGameFSM({
      gameId,
      gameOwnerId: playerId,
    });
    FSMs[gameId] = gameFSM;
  }
  
  return FSMs[gameId];
}
