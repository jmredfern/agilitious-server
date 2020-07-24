'use strict';

import { _getNextAvatarId } from '../../../src/services/avatarService';
import { UUID, Player } from '../../../src/types';
import WebSocket from 'ws';

describe('services/avatarService/_getNextAvatarId', () => {
	let result: UUID;
	let avatarIds: Array<UUID>;
	let players: Array<Player>;

	beforeEach(() => {
		avatarIds = [<UUID>'89c0a2a6-5922-4791-8890-2fc770a357d7', <UUID>'85dc0266-c834-455e-8bea-22192c937e13'];
	});

	describe('when no avatars have been assigned', () => {
		beforeEach(() => {
			players = [];
			result = _getNextAvatarId(avatarIds, players);
		});
		it('should return a random avatar', () => {
			expect(avatarIds.includes(result)).toBeTruthy();
		});
	});

	describe('when all avatars have been assigned', () => {
		beforeEach(() => {
			players = [
				{
					avatarId: <UUID>'89c0a2a6-5922-4791-8890-2fc770a357d7',
					name: 'player 1',
					playerId: <UUID>'065a4368-b566-4e5b-95c7-f37e2982dbe5',
					websocket: <WebSocket>(<unknown>'websocket 1'),
				},
				{
					avatarId: <UUID>'85dc0266-c834-455e-8bea-22192c937e13',
					name: 'player 2',
					playerId: <UUID>'3d20b5eb-66ce-45ea-90d0-3e211b34548d',
					websocket: <WebSocket>(<unknown>'websocket 2'),
				},
			];
			result = _getNextAvatarId(avatarIds, players);
		});
		it('should return the first avatar', () => {
			expect(result).toEqual(<UUID>'89c0a2a6-5922-4791-8890-2fc770a357d7');
		});
	});
});
