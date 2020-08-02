'use strict';

import { FSM, UUID } from '../types';

const FSMs: { [key: string]: FSM } = {};

export const getFSM = (gameId: UUID): FSM => FSMs[gameId];

export const setFSM = (gameId: UUID, fsmService: FSM): void => {
	FSMs[gameId] = fsmService;
};

export const removeFSM = (gameId: UUID): void => {
	delete FSMs[gameId];
};
