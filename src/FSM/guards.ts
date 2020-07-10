'use strict';

import logger from '../util/logger';
import { Player } from '../types';
import { Logger } from 'log4js';

const log: Logger = logger.getLoggerByFilename(__filename);

export const isActivePlayer = (context: any, event: any): boolean => {
  const { activePlayerId } = context;
  const result = activePlayerId && activePlayerId === event.playerId;
  if (!result) {
    const { type, id, playerId } = event;
    log.info('Illegal move attempted by non-active player: ' +
      `event: [type: ${type}, id: ${id}], playerId: ${playerId}`);
  }
  return result;
}

export const isLastPlayer = (context: any, event: any): boolean => {
  const { players } = context;
  const { playerId: playerIdToCheckFor } = event;
  return players.reduce((output: boolean, { finished, playerId }: Player): boolean => {
    output = output && (playerIdToCheckFor == playerId ? finished === false : finished === true);
    return output;
  }, true);
};
