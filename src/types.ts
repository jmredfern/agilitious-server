'use strict';

export type UUID = string;

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
	websocket: any;
	finished?: boolean;
}

export interface PlayerState {
	connected: boolean;
	id: UUID;
	name: string;
	avatarId: UUID;
}

export interface Context {
	activePlayerId: UUID;
	avatarSetId: UUID;
	gameId: UUID;
	issues: Array<Issue>;
	gameOwnerId: UUID;
	players: Array<Player>;
}

export interface Action {
	(context: Context, event: any, { action, state }: any): any;
}

export interface AvatarSet {
	avatarSetId: UUID;
	avatarIds: Array<UUID>;
}

export interface Event {
	type: string;
	id: UUID;
	gameId?: UUID;
	playerId?: UUID;
}

export interface ClientEvent extends Event {
	[key: string]: any;
}

export interface ServerEvent extends Event {
	eventByPlayerId: UUID;
	players: Array<PlayerState>;
}

export interface GameStateEvent extends ServerEvent {
	activePlayerId: UUID;
	gameOwnerId: UUID;
	phase: string;
	issues: Array<Issue>;
}

export type PlayerAddedEvent = ServerEvent;

export interface UpdatedPointsEvent extends ServerEvent {
	issue: Issue;
}

export interface IssueOpenedEvent extends ServerEvent {
	issueId: UUID;
}

export interface IssueClosedEvent extends ServerEvent {
	issueId: UUID;
}

export interface MoveConfirmedEvent extends ServerEvent {
	activePlayerId: UUID;
}

export interface PlayerSkippedEvent extends ServerEvent {
	activePlayerId: UUID;
	phase: string;
}
