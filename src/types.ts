'use strict';
import WebSocket from 'ws';

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

export interface Player {
	avatarId: UUID;
	name: string;
	playerId: UUID;
	websocket: WebSocket;
	finished?: boolean;
}

export interface PlayerState {
	connected: boolean;
	id: UUID;
	name: string;
	avatarId: UUID;
}

export interface Context {
	activePlayerId?: UUID;
	avatarSetId?: UUID;
	gameId: UUID;
	issues: Array<Issue>;
	gameOwnerId: UUID;
	players: Array<Player>;
}

export interface Action {
	(context: Context, event: any, { action, state }: any): void;
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
	[key: string]: any;
}

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
}

export interface PlayerSkippedEvent extends ServerEvent {
	activePlayerId: UUID;
	phase: string;
}
