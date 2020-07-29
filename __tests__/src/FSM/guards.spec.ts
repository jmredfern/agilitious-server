'use strict';

import { areOtherPlayersDone } from '../../../src/FSM/guards';
import WebSocket from 'ws';
import { Player, PlayerStatus } from '../../../src/types';

const { Skipped, AwaitingMove, ConfirmedChange } = PlayerStatus;

interface PlayerSetup {
	connected: boolean;
	status: PlayerStatus;
	playerId: string;
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
				'player2',
				<Array<PlayerSetup>>[
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
				false,
			],
			[
				'player3',
				<Array<PlayerSetup>>[
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
				false,
			],
			[
				'player3',
				<Array<PlayerSetup>>[
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
				true,
			],
			[
				'player4',
				<Array<PlayerSetup>>[
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
				true,
			],
			[
				'player4',
				<Array<PlayerSetup>>[
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
				false,
			],
			[
				'player4',
				<Array<PlayerSetup>>[
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
				true,
			],
			[
				'player1',
				<Array<PlayerSetup>>[
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
				false,
			],
			[
				'player2',
				<Array<PlayerSetup>>[
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
				true,
			],
			[
				'player2',
				<Array<PlayerSetup>>[
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
				true,
			],
		];
		describe.each(testSetups)(
			`%s's turn, using the following player setup: %o`,
			(activePlayerId, playerSetups, expected) => {
				beforeEach(() => {
					const context = { players: getPlayers(<Array<PlayerSetup>>playerSetups) };
					const event = { playerId: activePlayerId };
					result = areOtherPlayersDone(context, event);
				});
				it(`should return ${expected}`, () => {
					expect(result).toEqual(expected);
				});
			},
		);
	});
});
