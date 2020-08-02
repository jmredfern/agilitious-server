'use strict';

import WebSocket from 'ws';
import { Interpreter, State, StateConfig, StateMachine } from 'xstate';
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
	ephemeral: {
		cancelPlayerDisconnect?: Timeout;
	};
}

export interface PlayerState {
	connected: boolean;
	id: UUID;
	name: string;
	avatarId: UUID;
}

export interface FSMStateSchema {
	states: {
		ACTIVE: {
			states: {
				START: FSMState;
				PLAYING: FSMState;
				FINISHED: FSMState;
				HISTORY: FSMState;
			};
		};
		PERSISTED: FSMState;
	};
}

export type FSM = Interpreter<FSMContext, FSMStateSchema, FSMEvent, FSMTypestate>;

export type FSMState = State<FSMContext, FSMEvent, FSMStateSchema, FSMTypestate>;

export type FSMStateMachine = StateMachine<FSMContext, FSMStateSchema, FSMEvent>;

export type FSMStateConfig = StateConfig<FSMContext, FSMEvent>;

export type FSMStateValue = string | { ACTIVE: string };

export type FSMTypestate =
	| {
			value: 'ACTIVE';
			context: FSMContext;
	  }
	| {
			value: { ACTIVE: 'START' };
			context: FSMContext;
	  }
	| {
			value: { ACTIVE: 'PLAYING' };
			context: FSMContext;
	  }
	| {
			value: { ACTIVE: 'FINISHED' };
			context: FSMContext;
	  }
	| {
			value: { ACTIVE: 'HISTORY' };
			context: FSMContext;
	  }
	| {
			value: 'PERSISTED';
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
	ephemeral: {
		cancelScheduledActivate?: Timeout;
	};
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

export interface ActivateEvent extends ClientEvent {
	type: 'ACTIVATE';
}

export interface PersistEvent extends ClientEvent {
	type: 'PERSIST';
}

export type FSMEvent =
	| CreateGameClientEvent
	| JoinGameClientEvent
	| UpdatePointsClientEvent
	| OpenIssueClientEvent
	| CloseIssueClientEvent
	| ConfirmMoveEvent
	| NoChangeClientEvent
	| PlayerDisconnectClientEvent
	| ActivateEvent
	| PersistEvent;

export type ServerEvent = Event;

export interface GameStateServerEvent extends ServerEvent {
	type: 'GAME_STATE';
	activePlayerId: UUID;
	eventByPlayerId: UUID;
	gameOwnerId: UUID;
	issues: Array<Issue>;
	phase: string;
	playerId: UUID;
	players: Array<PlayerState>;
}

export interface UpdatedPointsServerEvent extends ServerEvent {
	type: 'UPDATED_POINTS';
	eventByPlayerId: UUID;
	issue: Issue;
}

export interface GameActivatedServerEvent extends ServerEvent {
	type: 'GAME_ACTIVATED';
	phase: string;
}

export interface IssueOpenedServerEvent extends ServerEvent {
	type: 'ISSUE_OPENED';
	eventByPlayerId: UUID;
	issueId: UUID;
}

export interface IssueClosedServerEvent extends ServerEvent {
	type: 'ISSUE_CLOSED';
	eventByPlayerId: UUID;
}

export interface PlayerAddedServerEvent extends ServerEvent {
	type: 'PLAYER_ADDED';
	eventByPlayerId: UUID;
	players: Array<PlayerState>;
}

export interface MoveConfirmedServerEvent extends ServerEvent {
	type: 'MOVE_CONFIRMED';
	activePlayerId: UUID;
	eventByPlayerId: UUID;
	phase: string;
}

export interface PlayerSkippedServerEvent extends ServerEvent {
	type: 'PLAYER_SKIPPED';
	activePlayerId: UUID;
	eventByPlayerId: UUID;
	phase: string;
}

export interface PlayerDisconnectServerEvent extends ServerEvent {
	type: 'PLAYER_DISCONNECTED';
	activePlayerId: UUID;
	eventByPlayerId: UUID;
	phase: string;
}

export interface FSMNotFoundEvent extends ServerEvent {
	type: 'FSM_NOT_FOUND';
	gameId: UUID;
}

export interface FSMStateEntity {
	id: UUID;
	json: string;
	phase: string;
	created_date: Date;
	updated_date: Date;
}
