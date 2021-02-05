'use strict';

import { Machine } from 'xstate';
import hardCodedIssues from '../../data/issuesSmall.json';
import { getMappedIssues, getSourceIssues } from '../services/issueStore';
import {
	ConfirmMoveEvent,
	FSMContext,
	FSMEvent,
	FSMStateMachine,
	FSMStateSchema,
	NoChangeClientEvent,
	Player,
	UUID,
	TrackedEvent,
} from '../types';
import actions from './actions';
import {
	areOtherPlayersDone,
	isOnlyConnectedPlayer,
	isPlayersTurn,
	noConnectedPlayers,
	oneOrMoreConnectedPlayers,
} from './guards';

export const createMachine = (gameId: UUID): FSMStateMachine => {
	return Machine<FSMContext, FSMStateSchema, FSMEvent>(
		{
			context: <FSMContext>{
				gameId,
				issues: getMappedIssues(gameId) || hardCodedIssues.issues,
				sourceIssues: getSourceIssues(gameId),
				players: <Array<Player>>[],
				ephemeral: {},
				currentMoves: [],
				moveHistory: <Array<TrackedEvent>>[],
			},
			id: 'GAME',
			initial: 'ACTIVE',
			states: {
				ACTIVE: {
					initial: 'START',
					states: {
						START: {
							on: {
								CREATE_GAME: {
									target: 'PLAYING',
									actions: ['createGame'],
								},
								PERSIST: {
									target: '#GAME.PERSISTED',
								},
							},
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
									cond: isPlayersTurn,
								},
								ADD_COMMENT: {
									target: 'PLAYING',
									actions: ['addComment'],
									cond: isPlayersTurn,
								},
								OPEN_ISSUE: {
									target: 'PLAYING',
									actions: ['openIssue'],
									cond: isPlayersTurn,
								},
								CLOSE_ISSUE: {
									target: 'PLAYING',
									actions: ['closeIssue'],
									cond: isPlayersTurn,
								},
								CONFIRM_MOVE: [
									{
										target: 'PLAYING',
										actions: ['confirmMove'],
										cond: (context: FSMContext, event: ConfirmMoveEvent) => {
											return (
												isPlayersTurn(context, event) && !isOnlyConnectedPlayer(context, event)
											);
										},
									},
									{
										target: 'GAME_OVER',
										actions: ['confirmMove'],
										cond: (context: FSMContext, event: ConfirmMoveEvent) => {
											return (
												isPlayersTurn(context, event) && isOnlyConnectedPlayer(context, event)
											);
										},
									},
								],
								NO_CHANGE: [
									{
										target: 'PLAYING',
										actions: ['noChange'],
										cond: (context: FSMContext, event: NoChangeClientEvent) => {
											return (
												isPlayersTurn(context, event) && !areOtherPlayersDone(context, event)
											);
										},
									},
									{
										target: 'GAME_OVER',
										actions: ['noChange'],
										cond: (context: FSMContext, event: NoChangeClientEvent) => {
											return isPlayersTurn(context, event) && areOtherPlayersDone(context, event);
										},
									},
								],
								PLAYER_DISCONNECT: {
									target: 'PLAYING',
									actions: ['playerDisconnect'],
								},
								PERSIST: {
									target: '#GAME.PERSISTED',
								},
							},
						},
						GAME_OVER: {
							entry: ['updateJira'],
							on: {
								JOIN_GAME: {
									target: 'GAME_OVER',
									actions: ['addPlayer'],
								},
								PLAYER_DISCONNECT: {
									target: 'GAME_OVER',
									actions: ['playerDisconnect'],
								},
								PERSIST: {
									target: '#GAME.PERSISTED',
								},
							},
						},
						FINISHED: {
							entry: ['scheduleCleanup'],
							type: 'final',
						},
						HISTORY: {
							type: 'history',
						},
					},
				},
				PERSISTED: {
					on: {
						JOIN_GAME: [
							{
								target: 'PERSISTED',
								actions: ['addPlayer', 'scheduleActivate', 'activateIfAllPlayersConnected'],
								cond: noConnectedPlayers,
							},
							{
								target: 'PERSISTED',
								actions: ['addPlayer', 'activateIfAllPlayersConnected'],
								cond: oneOrMoreConnectedPlayers,
							},
						],
						ACTIVATE: {
							target: 'ACTIVE.HISTORY',
							actions: ['activateGame'],
						},
					},
				},
			},
		},
		{
			actions: {
				...actions,
			},
		},
	);
};
