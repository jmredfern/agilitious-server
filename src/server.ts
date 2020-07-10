'use strict';

import { createServer } from 'http';
import bodyParser from 'body-parser';
import exphbs from 'express-handlebars';
import express from 'express';
import { inspect } from 'util';
import { storeCSVIssues, getCSVIssues } from './services/issueStore';
import logger from './util/logger';
import { Logger } from 'log4js';

import path from 'path';
import * as uuid from 'uuid';
import WebSocket from 'ws';
import cors from 'cors';
import { getFSM } from './FSM/FSM';

const log: Logger = logger.getLoggerByFilename(__filename);
const app = express();
const expressServer = createServer(app);

const wss = new WebSocket.Server({ server: expressServer });

const processPlayerEvent = (event: any, websocket: any): void => {
  const { gameId, playerId = uuid.v4() } = event;
  const FSM = getFSM(gameId, playerId);
  FSM.send({ ...event, playerId, websocket });
};

wss.on('connection', (websocket: any): void => {
  log.info('Client connected');
  websocket.on('message', (eventJSON: string): void => {
    const event = JSON.parse(eventJSON);
    log.info(`Server received: ${inspect(event)}`);
    processPlayerEvent(event, websocket);
  });

  websocket.on('close', (): void => {
    log.info('Client disconnected');
  });
});

app.use(bodyParser.text({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

const rootPath = path.resolve(path.dirname(''));
app.use('/assets/', express.static(path.join(rootPath, 'assets')))
app.use(express.static(path.join(__dirname, '../build')));

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.put('/api/games/:gameId/issues', cors(), async (req: any, res: any): Promise<any> => {
  const { gameId } = req.params;
  const { body: issuesCSV } = req;
  log.info(`Put issues for gameId ${gameId}`);
  await storeCSVIssues(gameId, issuesCSV);
  res.status(200).send();
})

app.get('/api/games/:gameId/issues', cors(), (req: any, res: any): any => {
  const { gameId } = req.params;
  log.info(`Get issues for gameId ${gameId}`);
  const issuesCSV = getCSVIssues(gameId);
  res.status(200).send(issuesCSV);
})

app.get('/*', (req, res, next) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'))
});

export const start = (port: number): void => {
  log.info('Starting server');
  expressServer.listen(port, () => {
    log.info(`Server listening on port ${port}`);
  });
};
