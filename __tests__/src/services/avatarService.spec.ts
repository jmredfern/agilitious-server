'use strict';

import { _getNextAvatarId } from '../../../src/services/avatarService';
import { UUID, Player, PlayerStatus } from '../../../src/types';
import WebSocket from 'ws';

const { AwaitingMove } = PlayerStatus;

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

	describe('when 1 avatar has been assigned', () => {
		beforeEach(() => {
			players = [
				{
					status: AwaitingMove,
					avatarId: <UUID>'89c0a2a6-5922-4791-8890-2fc770a357d7',
					name: 'player 1',
					playerId: <UUID>'065a4368-b566-4e5b-95c7-f37e2982dbe5',
					websocket: <WebSocket>(<unknown>'websocket 1'),
				},
			];
			result = _getNextAvatarId(avatarIds, players);
		});
		it('should return a random avatar', () => {
			expect(avatarIds.includes(result)).toBeTruthy();
		});
	});

	describe('when 2 avatars have been assigned', () => {
		beforeEach(() => {
			players = [
				{
					status: AwaitingMove,
					avatarId: <UUID>'89c0a2a6-5922-4791-8890-2fc770a357d7',
					name: 'player 1',
					playerId: <UUID>'065a4368-b566-4e5b-95c7-f37e2982dbe5',
					websocket: <WebSocket>(<unknown>'websocket 1'),
				},
				{
					status: AwaitingMove,
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

	describe('when 3 avatars have been assigned', () => {
		beforeEach(() => {
			players = [
				{
					status: AwaitingMove,
					avatarId: <UUID>'89c0a2a6-5922-4791-8890-2fc770a357d7',
					name: 'player 1',
					playerId: <UUID>'065a4368-b566-4e5b-95c7-f37e2982dbe5',
					websocket: <WebSocket>(<unknown>'websocket 1'),
				},
				{
					status: AwaitingMove,
					avatarId: <UUID>'85dc0266-c834-455e-8bea-22192c937e13',
					name: 'player 2',
					playerId: <UUID>'3d20b5eb-66ce-45ea-90d0-3e211b34548d',
					websocket: <WebSocket>(<unknown>'websocket 2'),
				},
				{
					status: AwaitingMove,
					avatarId: <UUID>'89c0a2a6-5922-4791-8890-2fc770a357d7',
					name: 'player 3',
					playerId: <UUID>'335cdd56-d005-489f-b15d-f7968ae7eb3c',
					websocket: <WebSocket>(<unknown>'websocket 3'),
				},
			];
			result = _getNextAvatarId(avatarIds, players);
		});
		it('should return the second avatar', () => {
			expect(result).toEqual(<UUID>'85dc0266-c834-455e-8bea-22192c937e13');
		});
	});

	describe('when 4 avatars have been assigned', () => {
		beforeEach(() => {
			players = [
				{
					status: AwaitingMove,
					avatarId: <UUID>'89c0a2a6-5922-4791-8890-2fc770a357d7',
					name: 'player 1',
					playerId: <UUID>'065a4368-b566-4e5b-95c7-f37e2982dbe5',
					websocket: <WebSocket>(<unknown>'websocket 1'),
				},
				{
					status: AwaitingMove,
					avatarId: <UUID>'85dc0266-c834-455e-8bea-22192c937e13',
					name: 'player 2',
					playerId: <UUID>'3d20b5eb-66ce-45ea-90d0-3e211b34548d',
					websocket: <WebSocket>(<unknown>'websocket 2'),
				},
				{
					status: AwaitingMove,
					avatarId: <UUID>'89c0a2a6-5922-4791-8890-2fc770a357d7',
					name: 'player 3',
					playerId: <UUID>'335cdd56-d005-489f-b15d-f7968ae7eb3c',
					websocket: <WebSocket>(<unknown>'websocket 3'),
				},
				{
					status: AwaitingMove,
					avatarId: <UUID>'85dc0266-c834-455e-8bea-22192c937e13',
					name: 'player 4',
					playerId: <UUID>'d807ed4b-d379-4d2f-b31c-13cfb7f0bb0a',
					websocket: <WebSocket>(<unknown>'websocket 4'),
				},
			];
			result = _getNextAvatarId(avatarIds, players);
		});
		it('should return the first avatar', () => {
			expect(result).toEqual(<UUID>'89c0a2a6-5922-4791-8890-2fc770a357d7');
		});
	});
});
