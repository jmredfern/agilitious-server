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
				const avatarId: UUID = <UUID>uuid.v5(avatarFilename, UUID_V5_NAMESPACE);
				avatarIdToFilepathMap[avatarId] = `${AVATAR_DIR}/${avatarSetFilename}/svg/${avatarFilename}`;
				return avatarId;
			});
			const output = await outputPromise;
			const avatarSetId: UUID = <UUID>uuid.v5(avatarSetFilename, UUID_V5_NAMESPACE);
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

export const getAvailableAvatarId = (players: Array<Player>, avatarSetId: UUID): UUID => {
	const avatarSets = getAvatarSets();
	let avatarSet = avatarSets.find(set => set.avatarSetId === avatarSetId);
	if (avatarSet === undefined) {
		log.warn(`Avatar set ${avatarSetId} not found, using default`);
		avatarSet = avatarSets[0];
	}
	const { avatarIds } = avatarSet;
	const avatarId: UUID = getNextAvatarId(avatarIds, players);
	log.info(`Found available avatar ${avatarId}: ${avatarIdToFilepathMap[avatarId]}`);
	return avatarId;
};

const getNextAvatarId = (avatarIds: Array<UUID>, players: Array<Player>) => {
	const inUseAvatarIds: Array<UUID> = players.map((player: Player) => player.avatarId);
	const availableAvatarIds = avatarIds.filter((avatarId: UUID) => !inUseAvatarIds.includes(avatarId));
	if (inUseAvatarIds.length < avatarIds.length) {
		const index = getRandomIntInclusive(0, availableAvatarIds.length - 1);
		return availableAvatarIds[index];
	} else {
		log.info(`All avatars have been assigned to players, recycling avatars.`);
		const index = players.length % avatarIds.length;
		return avatarIds[index];
	}
};
