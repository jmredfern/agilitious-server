'use strict';

import WebSocket from 'ws';
import { getNextPlayerId } from '../../../src/util/player';
import { UUID, Player, PlayerStatus, FSMWebSocket } from '../../../src/types';

const { AwaitingMove } = PlayerStatus;

describe('util/player', () => {
	let result: UUID;
	describe('getNextPlayerId', () => {
		let player1Id: UUID;
		let player2Id: UUID;
		let player3Id: UUID;

		beforeEach(() => {
			player1Id = <UUID>'289c262a-4ce5-4542-817d-97d0611bc743';
			player2Id = <UUID>'f9c42d02-bbc0-45cf-b49c-6fc1b72053da';
			player3Id = <UUID>'4962bd12-a1d0-431f-9a23-a2d33777ff85';
		});
		describe('there are no other players', () => {
			beforeEach(() => {
				const players: Array<Player> = [
					{
						status: AwaitingMove,
						avatarId: <UUID>'4611aa07-64f6-4884-863d-1aface590f72',
						name: 'player 1',
						playerId: player1Id,
						websocket: <FSMWebSocket>{
							readyState: WebSocket.OPEN,
						},
						ephemeral: {},
					},
				];
				result = getNextPlayerId({
					activePlayerId: player1Id,
					players,
				});
			});
			it('should return same player id', () => {
				expect(result).toEqual(player1Id);
			});
		});
		describe('there are no other connected players', () => {
			beforeEach(() => {
				const players: Array<Player> = [
					{
						status: AwaitingMove,
						avatarId: <UUID>'4611aa07-64f6-4884-863d-1aface590f72',
						name: 'player 1',
						playerId: player1Id,
						websocket: <FSMWebSocket>{
							readyState: WebSocket.CLOSED,
						},
						ephemeral: {},
					},
					{
						status: AwaitingMove,
						avatarId: <UUID>'4611aa07-64f6-4884-863d-1aface590f72',
						name: 'player 2',
						playerId: player2Id,
						websocket: <FSMWebSocket>{
							readyState: WebSocket.OPEN,
						},
						ephemeral: {},
					},
					{
						status: AwaitingMove,
						avatarId: <UUID>'4611aa07-64f6-4884-863d-1aface590f72',
						name: 'player 3',
						playerId: player3Id,
						websocket: <FSMWebSocket>{
							readyState: WebSocket.CLOSED,
						},
						ephemeral: {},
					},
				];
				result = getNextPlayerId({
					activePlayerId: player2Id,
					players,
				});
			});
			it('should return same player id', () => {
				expect(result).toEqual(player2Id);
			});
		});
		describe('there are other connected players who joined earlier', () => {
			beforeEach(() => {
				const players: Array<Player> = [
					{
						status: AwaitingMove,
						avatarId: <UUID>'4611aa07-64f6-4884-863d-1aface590f72',
						name: 'player 1',
						playerId: player1Id,
						websocket: <FSMWebSocket>{
							readyState: WebSocket.OPEN,
						},
						ephemeral: {},
					},
					{
						status: AwaitingMove,
						avatarId: <UUID>'4611aa07-64f6-4884-863d-1aface590f72',
						name: 'player 2',
						playerId: player2Id,
						websocket: <FSMWebSocket>{
							readyState: WebSocket.OPEN,
						},
						ephemeral: {},
					},
					{
						status: AwaitingMove,
						avatarId: <UUID>'4611aa07-64f6-4884-863d-1aface590f72',
						name: 'player 3',
						playerId: player3Id,
						websocket: <FSMWebSocket>{
							readyState: WebSocket.CLOSED,
						},
						ephemeral: {},
					},
				];
				result = getNextPlayerId({
					activePlayerId: player2Id,
					players,
				});
			});
			it('should return the next connected player id', () => {
				expect(result).toEqual(player1Id);
			});
		});
		describe('there are other connected players who joined later', () => {
			beforeEach(() => {
				const players: Array<Player> = [
					{
						status: AwaitingMove,
						avatarId: <UUID>'4611aa07-64f6-4884-863d-1aface590f72',
						name: 'player 1',
						playerId: player1Id,
						websocket: <FSMWebSocket>{
							readyState: WebSocket.CLOSED,
						},
						ephemeral: {},
					},
					{
						status: AwaitingMove,
						avatarId: <UUID>'4611aa07-64f6-4884-863d-1aface590f72',
						name: 'player 2',
						playerId: player2Id,
						websocket: <FSMWebSocket>{
							readyState: WebSocket.OPEN,
						},
						ephemeral: {},
					},
					{
						status: AwaitingMove,
						avatarId: <UUID>'4611aa07-64f6-4884-863d-1aface590f72',
						name: 'player 3',
						playerId: player3Id,
						websocket: <FSMWebSocket>{
							readyState: WebSocket.OPEN,
						},
						ephemeral: {},
					},
				];
				result = getNextPlayerId({
					activePlayerId: player2Id,
					players,
				});
			});
			it('should return the next connected player id', () => {
				expect(result).toEqual(player3Id);
			});
		});
	});
});
