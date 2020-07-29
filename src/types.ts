'use strict';
import WebSocket from 'ws';
import { StateSchema } from 'xstate';

export type UUID = string & { readonly _: unique symbol }; // ensure string can't be assigned to a UUID

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
	websocket: WebSocket;
	status: PlayerStatus;
}

export interface PlayerState {
	connected: boolean;
	id: UUID;
	name: string;
	avatarId: UUID;
}

interface State {
	[key: string]: StateSchema<any>;
}

export interface FSMStateSchema {
	states: {
		START: State;
		PLAYING: State;
		FINISHED: State;
	};
}

export interface Context {
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

export interface CreateGameEvent extends ClientEvent {
	type: 'CREATE_GAME';
	avatarSetId: UUID;
	websocket: WebSocket;
}

export interface JoinGameEvent extends ClientEvent {
	type: 'JOIN_GAME';
	websocket: WebSocket;
	name: string;
}

export interface UpdatePointsEvent extends ClientEvent {
	type: 'UPDATE_POINTS';
	issueId: UUID;
	points: number;
}

export interface OpenIssueEvent extends ClientEvent {
	type: 'OPEN_ISSUE';
	issueId: UUID;
}

export interface CloseIssueEvent extends ClientEvent {
	type: 'CLOSE_ISSUE';
	issueId: UUID;
}

export interface ConfirmMoveEvent extends ClientEvent {
	type: 'CONFIRM_MOVE';
}

export interface NoChangeEvent extends ClientEvent {
	type: 'NO_CHANGE';
}

export interface Action {
	(context: Context, event: FSMEvent, { action, state }: any): void;
}

export type FSMEvent =
	| CreateGameEvent
	| JoinGameEvent
	| UpdatePointsEvent
	| OpenIssueEvent
	| CloseIssueEvent
	| ConfirmMoveEvent
	| NoChangeEvent;

export interface ServerEvent extends Event {
	eventByPlayerId: UUID;
}

export interface GameStateEvent extends ServerEvent {
	activePlayerId: UUID;
	gameOwnerId: UUID;
	issues: Array<Issue>;
	phase: string;
	playerId: UUID;
	players: Array<PlayerState>;
}

export interface UpdatedPointsEvent extends ServerEvent {
	issue: Issue;
}

export interface IssueOpenedEvent extends ServerEvent {
	issueId: UUID;
}

export type IssueClosedEvent = ServerEvent;

export interface PlayerAddedEvent extends ServerEvent {
	players: Array<PlayerState>;
}

export interface MoveConfirmedEvent extends ServerEvent {
	activePlayerId: UUID;
	phase: string;
}

export interface PlayerSkippedEvent extends ServerEvent {
	activePlayerId: UUID;
	phase: string;
}
