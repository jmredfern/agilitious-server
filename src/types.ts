'use strict';

export interface Issue {
	id: string,
	acceptanceCriteria: string,
	created: number,
	currentPoints: number,
	description: string,
	epicId: string,
	epicKey: string,
	key: string,
	originalPoints: number,
	reporter: string,
	status: string,
	title: string,
	type: string
}

export interface Player {
	name: string,
	playerId: string,
	websocket: any
	finished?: boolean
}

export interface Context {
	activePlayerId: string,
	gameId: string,
	issues: Array<Issue>,
	gameOwnerId: string,
	players: Array<Player>,
}

export interface Action {
	(context: Context, event: any, { action, state }: any): any;
}
