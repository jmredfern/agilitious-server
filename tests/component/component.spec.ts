'use strict';

import * as uuid from 'uuid';
import { generatePlayer } from './player';

describe('basic gameplay', () => {
	const gameId = uuid.v4();

	const players = ['Player 1', 'Player 2'].map((name) => generatePlayer(name));

	beforeAll(async () => {
		await Promise.all(players.map((player) => player.connect()));
	});

	afterAll(async () => {
		await Promise.all(players.map((player) => player.disconnect()));
	});

	it('should complete correctly', async () => {
		await players[0].sendCreateGame(gameId);

		expect(await players[0].getMessage()).toMatchObject({ phase: 'PLAYING', type: 'GAME_STATE' });

		await players[1].sendJoinGame(gameId);

		expect(await players[0].getMessage()).toMatchObject({ type: 'PLAYER_ADDED' });
		expect(await players[1].getMessage()).toMatchObject({ phase: 'PLAYING', type: 'GAME_STATE' });

		await players[0].sendUpdatePoints('10664', 13);

		expect(await players[0].getMessage()).toMatchObject({ type: 'UPDATED_POINTS' });
		expect(await players[1].getMessage()).toMatchObject({ type: 'UPDATED_POINTS' });

		await players[0].sendConfirmMove();

		expect(await players[0].getMessage()).toMatchObject({ type: 'MOVE_CONFIRMED' });
		expect(await players[1].getMessage()).toMatchObject({ type: 'MOVE_CONFIRMED' });

		await players[1].sendUpdatePoints('10542', 8);

		expect(await players[0].getMessage()).toMatchObject({ type: 'UPDATED_POINTS' });
		expect(await players[1].getMessage()).toMatchObject({ type: 'UPDATED_POINTS' });

		await players[1].sendConfirmMove();

		expect(await players[0].getMessage()).toMatchObject({ type: 'MOVE_CONFIRMED' });
		expect(await players[1].getMessage()).toMatchObject({ type: 'MOVE_CONFIRMED' });

		await players[0].sendNoChange();

		expect(await players[0].getMessage()).toMatchObject({ phase: 'PLAYING', type: 'PLAYER_SKIPPED' });
		expect(await players[1].getMessage()).toMatchObject({ phase: 'PLAYING', type: 'PLAYER_SKIPPED' });

		await players[1].sendNoChange();

		expect(await players[0].getMessage()).toMatchObject({ phase: 'GAME_OVER', type: 'PLAYER_SKIPPED' });
		expect(await players[1].getMessage()).toMatchObject({ phase: 'GAME_OVER', type: 'PLAYER_SKIPPED' });
	}, 20000);
});
