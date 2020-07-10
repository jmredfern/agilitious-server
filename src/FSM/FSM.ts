'use strict';

import logger from '../util/logger';
import { getIssues } from '../services/issueStore';
import { Machine, interpret }  from 'xstate';
import hardCodedIssues from '../../data/issuesSmall.json';
import { Logger } from 'log4js';
import {
  isActivePlayer,
  isLastPlayer,
} from './guards';
import * as actions from './actions';

const log: Logger = logger.getLoggerByFilename(__filename);

const FSMs: { [key: string]: any } = {};

const createMachine = (gameId: string, gameOwnerId: string): any => {
  return Machine(
    {
      context: {
        gameId,
        issues: getIssues(gameId) || hardCodedIssues.issues,
        gameOwnerId,
        players: [],
      },
      id: 'game',
      initial: 'START',
      states: {
        START: {
          on: {
            JOIN_GAME: {
              target: 'PLAYING',
              actions: ['addPlayer'],
            },
          }
        },
        PLAYING: {
          on: {
            JOIN_GAME: {
              target: 'PLAYING',
              actions: ['addPlayer'],
            },
            UPDATE_POINTS: {
              target: 'PLAYING',
              actions: ['updatePoints'],
              cond: isActivePlayer,
            },
            OPEN_ISSUE: {
              target: 'PLAYING',
              actions: ['openIssue'],
              cond: isActivePlayer,
            },
            CLOSE_ISSUE: {
              target: 'PLAYING',
              actions: ['closeIssue'],
              cond: isActivePlayer,
            },
            CONFIRM_MOVE: {
              target: 'PLAYING',
              actions: ['confirmMove'],
              cond: isActivePlayer,
            },
            NO_CHANGE: [{
              target: 'PLAYING',
              actions: ['noChange'],
              cond: (context: any, event: any) => {
                return isActivePlayer(context, event)
                  && !isLastPlayer(context, event);
              },
            }, {
              target: 'FINISHED',
              actions: ['noChange'],
              cond: (context: any, event: any) => {
                return isActivePlayer(context, event)
                  && isLastPlayer(context, event);
              },
            }],
          },
        },
        FINISHED: {
          type: 'final'
        },
      },
    },
    { actions },
  );
};

const createService = (gameId: string, gameOwnerId: string): any => {
  const machine = createMachine(gameId, gameOwnerId);
  const service = interpret(machine).onTransition(state =>
    log.info(state.value)
  );
  return service;
}

export const getFSM = (gameId: string, playerId: string): any  => {
  if (!FSMs[gameId]) {
    const gameOwnerId = playerId;
    const service = createService(gameId, gameOwnerId);
    service.start();
    FSMs[gameId] = service;
  }
  
  return FSMs[gameId];
}