'use strict';

import * as uuid from 'uuid';
import { getWebSocket } from '@jmredfern/websocket-with-promises';

interface Player {
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
	getMessage: () => Promise<object>;
	sendCreateGame: (gameId: string) => Promise<void>;
	sendJoinGame: (gameId: string) => Promise<void>;
	sendUpdatePoints: (issueId: string, points: number) => Promise<void>;
	sendConfirmMove: () => Promise<void>;
	sendNoChange: () => Promise<void>;
}

export const generatePlayer = (name: string): Player => {
	const playerId = uuid.v4();
	const websocket = getWebSocket({
		URL: 'ws://localhost:8000',
	});
	let _gameId = '';
	return {
		connect: () => websocket.connect(),
		disconnect: () => websocket.disconnect(),
		getMessage: () => websocket.getMessageAsObject(),
		sendCreateGame: (gameId: string) => {
			_gameId = gameId;
			return websocket.sendMessageAsJSON({
				avatarSetId: '46efff1b-5ca2-57fc-8e98-f1bad529f45f',
				gameId,
				id: uuid.v4(),
				name,
				playerId,
				type: 'CREATE_GAME',
			});
		},
		sendJoinGame: (gameId: string) => {
			_gameId = gameId;
			return websocket.sendMessageAsJSON({
				gameId,
				id: uuid.v4(),
				name,
				playerId,
				type: 'JOIN_GAME',
			});
		},
		sendUpdatePoints: (issueId: string, points: number) => {
			return websocket.sendMessageAsJSON({
				gameId: _gameId,
				id: uuid.v4(),
				playerId,
				type: 'UPDATE_POINTS',
				issueId,
				points,
			});
		},
		sendConfirmMove: () => {
			return websocket.sendMessageAsJSON({
				gameId: _gameId,
				id: uuid.v4(),
				playerId,
				type: 'CONFIRM_MOVE',
			});
		},
		sendNoChange: () => {
			return websocket.sendMessageAsJSON({
				gameId: _gameId,
				id: uuid.v4(),
				playerId,
				type: 'NO_CHANGE',
			});
		},
	};
};
