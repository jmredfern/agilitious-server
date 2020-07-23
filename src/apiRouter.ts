'use strict';

import { Request, Response, Router } from 'express';
import cors from 'cors';
import { storeCSVIssues, getCSVIssues } from './services/issueStore';
import { getLoggerByFilename } from './util/logger';
import { Logger } from 'log4js';
import { getAvatarSets, getAvatarFilepath } from './services/avatarService';

const log: Logger = getLoggerByFilename(__filename);

export const apiRouter = Router();

apiRouter.get(
	'/avatar/sets',
	cors(),
	async (req: Request, res: Response): Promise<void> => {
		const avatarSets = getAvatarSets();
		res.status(200).send(avatarSets);
	},
);

apiRouter.get('/avatar/:avatarId', cors(), (req: Request, res: Response): void => {
	const { avatarId } = req.params;
	const avatarFilepath = getAvatarFilepath(avatarId);
	res.status(200).sendFile(`${process.cwd()}/${avatarFilepath}`);
});

apiRouter.put(
	'/games/:gameId/issues',
	cors(),
	async (req: Request, res: Response): Promise<void> => {
		const { gameId } = req.params;
		const { body: issuesCSV } = req;
		log.info(`Put issues for gameId ${gameId}`);
		await storeCSVIssues(gameId, issuesCSV);
		res.status(200).send();
	},
);

apiRouter.get('/games/:gameId/issues', cors(), (req: Request, res: Response): void => {
	const { gameId } = req.params;
	log.info(`Get issues for gameId ${gameId}`);
	const issuesCSV = getCSVIssues(gameId);
	res.status(200).send(issuesCSV);
});
