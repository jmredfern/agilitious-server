'use strict';

import { promisify } from 'util';
import fs from 'fs';
import * as uuid from 'uuid';
import { AvatarSet, Player, UUID } from '../types';
import { getRandomIntInclusive } from '../util/math';
import { getLoggerByFilename } from '../util/logger';
import { Logger } from 'log4js';

const log: Logger = getLoggerByFilename(__filename);

const readdir = promisify(fs.readdir);

const AVATAR_DIR = 'assets/avatars';
const UUID_V5_NAMESPACE = '7f51c45b-839c-4440-ba4c-7980943291e1';

const avatarIdToFilepathMap: {
	[avatarId: string]: string;
} = {};

let avatarSetsCache: Array<AvatarSet>;

const generateAvatarSetsCache = async () => {
	const avatarSetFilenames: Array<string> = await readdir(AVATAR_DIR);
	avatarSetsCache = await avatarSetFilenames.reduce(
		async (outputPromise: Promise<Array<AvatarSet>>, avatarSetFilename: string) => {
			const avatarFilenames: Array<string> = await readdir(`${AVATAR_DIR}/${avatarSetFilename}/svg`);
			const avatarIds = avatarFilenames.map(avatarFilename => {
				const avatarId: UUID = uuid.v5(avatarFilename, UUID_V5_NAMESPACE);
				avatarIdToFilepathMap[avatarId] = `${AVATAR_DIR}/${avatarSetFilename}/svg/${avatarFilename}`;
				return avatarId;
			});
			const output = await outputPromise;
			const avatarSetId = uuid.v5(avatarSetFilename, UUID_V5_NAMESPACE);
			output.push({ avatarSetId, avatarIds });
			return output;
		},
		Promise.resolve([]),
	);
	return avatarSetsCache;
};

(async () => {
	avatarSetsCache = await generateAvatarSetsCache();
})();

export const getAvatarSets = (): Array<AvatarSet> => {
	return avatarSetsCache;
};

export const getAvatarFilepath = (avatarId: UUID): string => {
	return avatarIdToFilepathMap[avatarId];
};

export const getNewAvatar = (players: Array<Player>, avatarSetId: UUID): UUID => {
	const avatarSets = getAvatarSets();
	const avatarSet = avatarSets.find(set => set.avatarSetId === avatarSetId);
	if (avatarSet === undefined) {
		log.error('Avatar set not found!');
		return '';
	}
	const { avatarIds } = avatarSet;
	const inUseAvatarIds = players.map((player: Player) => player.avatarId);
	const availableAvatarIds = avatarIds.filter((avatarId: UUID) => !inUseAvatarIds.includes(avatarId));
	const avatarIdIndex = getRandomIntInclusive(0, availableAvatarIds.length - 1);
	return availableAvatarIds[avatarIdIndex];
};
