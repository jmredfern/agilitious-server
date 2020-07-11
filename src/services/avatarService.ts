'use strict';

import { promisify } from 'util';
const fs = require('fs')
import { v5 as uuidv5 } from 'uuid';

const readdir = promisify(fs.readdir);

const AVATAR_DIR: string = 'assets/avatars'
const UUID_V5_NAMESPACE = '7f51c45b-839c-4440-ba4c-7980943291e1';

interface AvatarSet {
	avatarSetId: string,
	avatarIds: Array<string>
}

const avatarIdToFilepathMap: {
	[avatarId: string]: string;
} = {}

let avatarSetsCache: Array<AvatarSet>;

const generateAvatarSetsCache = async () => {
	const avatarSetFilenames: Array<string> = await readdir(AVATAR_DIR);
	avatarSetsCache = await avatarSetFilenames.reduce(async (outputPromise: Promise<Array<AvatarSet>>,
			avatarSetFilename: string) => {
		const avatarFilenames: Array<string> = await readdir(`${AVATAR_DIR}/${avatarSetFilename}/svg`);
		const avatarIds = avatarFilenames.map(avatarFilename => {
			const avatarId = uuidv5(avatarFilename, UUID_V5_NAMESPACE);
			avatarIdToFilepathMap[avatarId] = `${AVATAR_DIR}/${avatarSetFilename}/svg/${avatarFilename}`;
			return avatarId;
		});
		const output = await outputPromise;
		const avatarSetId = uuidv5(avatarSetFilename, UUID_V5_NAMESPACE);
		output.push({ avatarSetId, avatarIds });
		return output;
	}, Promise.resolve([]));
	return avatarSetsCache;
}

(async () => {
	avatarSetsCache = await generateAvatarSetsCache();
})()

export const getAvatarSets = () => {
	return avatarSetsCache;
};

export const getAvatarFilepath = (avatarId: string) => {
	return avatarIdToFilepathMap[avatarId];
};