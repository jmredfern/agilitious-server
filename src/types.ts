'use strict';

import WebSocket from 'ws';
import { State, Interpreter, StateMachine, StateConfig } from 'xstate';
import Timeout = NodeJS.Timeout;

export type UUID = string & { readonly _: unique symbol }; // ensure string can't be assigned to a UUID

export interface JSONIssue {
	'Custom field (Acceptance Criteria)': string;
	'Custom field (Epic Link)': string;
	'Custom field (Story Points)': string;
	'Issue key': string;
	'Issue Type': string;
	Created: string;
	Description: string;
	Reporter: string;
	Status: string;
	Summary: string;
}

export interface Issue {
	id: UUID;
	acceptanceCriteria: string;
	created: number;
	currentPoints: number;
	description: string;
	epicId: string;
	epicKey: string;
	key: string;
	originalPoints: number;
	reporter: string;
	status: string;
	title: string;
	type: string;
}

export enum PlayerStatus {
	AwaitingMove = 'AwaitingMove',
	ConfirmedChange = 'ConfirmedChange',
	Skipped = 'Skipped',
}

export interface Player {
	avatarId: UUID;
	name: string;
	playerId: UUID;
	websocket: FSMWebSocket;
	status: PlayerStatus;
	cancelPlayerDisconnect?: Timeout;
}

export interface PlayerState {
	connected: boolean;
	id: UUID;
	name: string;
	avatarId: UUID;
}

export interface FSMStateSchema {
	states: {
		START: State<FSMContext, FSMEvent, FSMStateSchema, FSMTypestate>;
		PLAYING: State<FSMContext, FSMEvent, FSMStateSchema, FSMTypestate>;
		FINISHED: State<FSMContext, FSMEvent, FSMStateSchema, FSMTypestate>;
	};
}

export type FSM = Interpreter<FSMContext, FSMStateSchema, FSMEvent, FSMTypestate>;

export type FSMState = State<FSMContext, FSMEvent, FSMStateSchema, FSMTypestate>;

export type FSMStateMachine = StateMachine<FSMContext, FSMStateSchema, FSMEvent>;

export type FSMStateConfig = StateConfig<FSMContext, FSMEvent>;

export type FSMTypestate =
	| {
			value: 'START';
			context: FSMContext;
	  }
	| {
			value: 'PLAYING';
			context: FSMContext;
	  }
	| {
			value: 'FINISHED';
			context: FSMContext;
	  };

export interface FSMWebSocket extends WebSocket {
	gameId?: UUID;
	playerId?: UUID;
}

export interface FSMContext {
	activePlayerId: UUID;
	avatarSetId: UUID;
	gameId: UUID;
	issues: Array<Issue>;
	gameOwnerId: UUID;
	players: Array<Player>;
}

export interface AvatarSet {
	avatarSetId: UUID;
	avatarIds: Array<UUID>;
}

export interface Event {
	type: string;
	id: UUID;
}

export interface ClientEvent extends Event {
	gameId: UUID;
	playerId: UUID;
}

export interface CreateGameClientEvent extends ClientEvent {
	type: 'CREATE_GAME';
	avatarSetId: UUID;
	websocket: FSMWebSocket;
	name: string;
}

export interface JoinGameClientEvent extends ClientEvent {
	type: 'JOIN_GAME';
	websocket: FSMWebSocket;
	name: string;
}

export interface UpdatePointsClientEvent extends ClientEvent {
	type: 'UPDATE_POINTS';
	issueId: UUID;
	points: number;
}

export interface OpenIssueClientEvent extends ClientEvent {
	type: 'OPEN_ISSUE';
	issueId: UUID;
}

export interface CloseIssueClientEvent extends ClientEvent {
	type: 'CLOSE_ISSUE';
	issueId: UUID;
}

export interface ConfirmMoveEvent extends ClientEvent {
	type: 'CONFIRM_MOVE';
}

export interface NoChangeClientEvent extends ClientEvent {
	type: 'NO_CHANGE';
}

export interface PlayerDisconnectClientEvent extends ClientEvent {
	type: 'PLAYER_DISCONNECT';
}

export interface Action {
	(context: FSMContext, event: FSMEvent, { state }: { state: FSMTypestate }): void;
}

export type FSMEvent =
	| CreateGameClientEvent
	| JoinGameClientEvent
	| UpdatePointsClientEvent
	| OpenIssueClientEvent
	| CloseIssueClientEvent
	| ConfirmMoveEvent
	| NoChangeClientEvent
	| PlayerDisconnectClientEvent;

export interface ServerEvent extends Event {
	eventByPlayerId: UUID;
}

export interface GameStateServerEvent extends ServerEvent {
	type: 'GAME_STATE';
	activePlayerId: UUID;
	gameOwnerId: UUID;
	issues: Array<Issue>;
	phase: string;
	playerId: UUID;
	players: Array<PlayerState>;
}

export interface UpdatedPointsServerEvent extends ServerEvent {
	type: 'UPDATED_POINTS';
	issue: Issue;
}

export interface IssueOpenedServerEvent extends ServerEvent {
	type: 'ISSUE_OPENED';
	issueId: UUID;
}

export interface IssueClosedServerEvent extends ServerEvent {
	type: 'ISSUE_CLOSED';
}

export interface PlayerAddedServerEvent extends ServerEvent {
	type: 'PLAYER_ADDED';
	players: Array<PlayerState>;
}

export interface MoveConfirmedServerEvent extends ServerEvent {
	type: 'MOVE_CONFIRMED';
	activePlayerId: UUID;
	phase: string;
}

export interface PlayerSkippedServerEvent extends ServerEvent {
	type: 'PLAYER_SKIPPED';
	activePlayerId: UUID;
	phase: string;
}

export interface PlayerDisconnectServerEvent extends ServerEvent {
	type: 'PLAYER_DISCONNECTED';
	activePlayerId: UUID;
	phase: string;
}

export interface FSMNotFoundEvent extends Event {
	type: 'FSM_NOT_FOUND';
}

export interface FSMStateEntity {
	id: UUID;
	json: string;
	current_state: string;
	created_date: Date;
	updated_date: Date;
}
