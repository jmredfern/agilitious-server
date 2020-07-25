'use strict';

import { Request, Response, Router } from 'express';
import cors from 'cors';
import { storeCSVIssues } from './services/issueStore';
import { getLoggerByFilename } from './util/logger';
import { Logger } from 'log4js';
import { getAvatarSets, getAvatarFilepath } from './services/avatarService';
import { UUID } from './types';

const log: Logger = getLoggerByFilename(__filename);

export const apiRouter = Router();

const corsOptions = {
	origin: 'https://agilicio.us',
};

apiRouter.get(
	'/avatar/sets',
	cors(corsOptions),
	async (req: Request, res: Response): Promise<void> => {
		const avatarSets = getAvatarSets();
		res.status(200).send(avatarSets);
	},
);

apiRouter.get('/avatar/:avatarId', cors(corsOptions), (req: Request, res: Response): void => {
	const { avatarId } = req.params;
	const avatarFilepath = getAvatarFilepath(<UUID>avatarId);
	res.status(200).sendFile(`${process.cwd()}/${avatarFilepath}`);
});

apiRouter.put(
	'/games/:gameId/issues',
	cors(corsOptions),
	async (req: Request, res: Response): Promise<void> => {
		const { gameId } = req.params;
		const { body: issuesCSV } = req;
		log.info(`Put issues for gameId ${gameId}`);
		await storeCSVIssues(<UUID>gameId, issuesCSV);
		res.status(200).send();
	},
);

// apiRouter.get('/games/:gameId/issues', cors(), (req: Request, res: Response): void => {
// 	const { gameId } = req.params;
// 	log.info(`Get issues for gameId ${gameId}`);
// 	const issuesCSV = getCSVIssues(gameId);
// 	res.status(200).send(issuesCSV);
// });
