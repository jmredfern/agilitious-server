'use strict';

import { Request, Response, Router } from 'express';
import cors from 'cors';
import { getAvatarSets, getAvatarFilepath } from './services/avatarService';
import { UUID } from './types';

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

// TODO remove this endpoint
apiRouter.put(
	'/games/:gameId/issues',
	cors(corsOptions),
	async (req: Request, res: Response): Promise<void> => {
		res.status(200).send();
	},
);
