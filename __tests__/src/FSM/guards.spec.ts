'use strict';

import { areOtherPlayersDone } from '../../../src/FSM/guards';
import WebSocket from 'ws';
import { Player, PlayerStatus } from '../../../src/types';
import { inspect } from 'util';

const { Skipped, AwaitingMove, ConfirmedChange } = PlayerStatus;

interface PlayerSetup {
	connected: boolean;
	status: PlayerStatus;
	playerId: string;
}

interface TestSetup {
	activePlayerId: string;
	playerSetups: Array<PlayerSetup>;
	expectedResult: boolean;
}

const getPlayers = (playerSetups: Array<PlayerSetup>): Array<Player> =>
	playerSetups.map((playerSetup: PlayerSetup) => {
		const { status, connected, playerId } = playerSetup;
		return <Player>{
			status,
			playerId,
			websocket: {
				readyState: connected ? WebSocket.OPEN : WebSocket.CLOSED,
			},
		};
	});

describe('FSM/guards', () => {
	let result: boolean;
	describe('areOtherPlayersDone', () => {
		const testSetups = [
			[
				{
					activePlayerId: 'player2',
					playerSetups: <Array<PlayerSetup>>[
						{
							connected: true,
							status: Skipped,
							playerId: 'player1',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player2',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player3',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player4',
						},
					],
					expectedResult: false,
				},
			],
			[
				{
					activePlayerId: 'player3',
					playerSetups: <Array<PlayerSetup>>[
						{
							connected: true,
							status: Skipped,
							playerId: 'player1',
						},
						{
							connected: true,
							status: Skipped,
							playerId: 'player2',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player3',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player4',
						},
					],
					expectedResult: false,
				},
			],
			[
				{
					activePlayerId: 'player3',
					playerSetups: <Array<PlayerSetup>>[
						{
							connected: true,
							status: Skipped,
							playerId: 'player1',
						},
						{
							connected: true,
							status: Skipped,
							playerId: 'player2',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player3',
						},
						{
							connected: false,
							status: AwaitingMove,
							playerId: 'player4',
						},
					],
					expectedResult: true,
				},
			],
			[
				{
					activePlayerId: 'player4',
					playerSetups: <Array<PlayerSetup>>[
						{
							connected: true,
							status: Skipped,
							playerId: 'player1',
						},
						{
							connected: true,
							status: Skipped,
							playerId: 'player2',
						},
						{
							connected: true,
							status: Skipped,
							playerId: 'player3',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player4',
						},
					],
					expectedResult: true,
				},
			],
			[
				{
					activePlayerId: 'player4',
					playerSetups: <Array<PlayerSetup>>[
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player1',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player2',
						},
						{
							connected: true,
							status: ConfirmedChange,
							playerId: 'player3',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player4',
						},
					],
					expectedResult: false,
				},
			],
			[
				{
					activePlayerId: 'player4',
					playerSetups: <Array<PlayerSetup>>[
						{
							connected: false,
							status: AwaitingMove,
							playerId: 'player1',
						},
						{
							connected: false,
							status: AwaitingMove,
							playerId: 'player2',
						},
						{
							connected: true,
							status: ConfirmedChange,
							playerId: 'player3',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player4',
						},
					],
					expectedResult: true,
				},
			],
			[
				{
					activePlayerId: 'player1',
					playerSetups: <Array<PlayerSetup>>[
						{
							connected: false,
							status: AwaitingMove,
							playerId: 'player1',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player2',
						},
						{
							connected: true,
							status: ConfirmedChange,
							playerId: 'player3',
						},
						{
							connected: true,
							status: Skipped,
							playerId: 'player4',
						},
					],
					expectedResult: false,
				},
			],
			[
				{
					activePlayerId: 'player2',
					playerSetups: <Array<PlayerSetup>>[
						{
							connected: false,
							status: Skipped,
							playerId: 'player1',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player2',
						},
						{
							connected: true,
							status: ConfirmedChange,
							playerId: 'player3',
						},
						{
							connected: true,
							status: Skipped,
							playerId: 'player4',
						},
					],
					expectedResult: true,
				},
			],
			[
				{
					activePlayerId: 'player2',
					playerSetups: <Array<PlayerSetup>>[
						{
							connected: false,
							status: Skipped,
							playerId: 'player1',
						},
						{
							connected: true,
							status: AwaitingMove,
							playerId: 'player2',
						},
						{
							connected: false,
							status: ConfirmedChange,
							playerId: 'player3',
						},
						{
							connected: true,
							status: Skipped,
							playerId: 'player4',
						},
					],
					expectedResult: true,
				},
			],
		];
		describe.each(testSetups)('', ({ activePlayerId, playerSetups, expectedResult }: TestSetup) => {
			const playerSetupsString = inspect(playerSetups);
			describe(`When it's ${activePlayerId}'s turn, using the following player setups: ${playerSetupsString}`, () => {
				beforeEach(() => {
					const context = { players: getPlayers(playerSetups) };
					const event = { playerId: activePlayerId };
					result = areOtherPlayersDone(context, event);
				});
				it(`calling areOtherPlayersDone() should return ${expectedResult}`, () => {
					expect(result).toEqual(expectedResult);
				});
			});
		});
	});
});
