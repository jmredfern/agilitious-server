'use strict';

const { createServer } = require('http');
const bodyParser = require('body-parser')
const exphbs = require('express-handlebars');
const express = require('express');
const inspect = require('util').inspect;
const { storeCSVIssues, getCSVIssues } = require('./services/issueStore.js');
const logger = require('./util/logger.js');
const log = logger.getLoggerByFilename({ filename: __filename });
const path = require('path');
const uuid = require('uuid');
const WebSocket = require('ws');
const { getGameFSM } = require('./services/gameFSM');

let serverUrl;

const app = express();
const expressServer = createServer(app);

const wss = new WebSocket.Server({ server: expressServer });

const processPlayerEvent = ({ event, websocket }) => {
  const { gameId, playerId = uuid.v4() } = event;
  const gameFSM = getGameFSM({ gameId, playerId });
  gameFSM.send({ ...event, playerId, websocket });
};

wss.on('connection', websocket => {
  log.info('Client connected');
  websocket.on('message', eventJSON => {
    const event = JSON.parse(eventJSON);
    log.info(`Server received: ${inspect(event)}`);
    processPlayerEvent({ event, websocket });
  });

  websocket.on('close', () => {
    log.info('Client disconnected');
  });
});

app.use(bodyParser.text({ extended: true, limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

const rootPath = path.resolve(path.dirname(''));
app.use('/assets/', express.static(path.join(rootPath, 'assets')))

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.get('/', (req, res, next) => {
  res.render('index', {
      helpers: {
          clickUrl: () => `${serverUrl}/click`,
      }
  });
});

app.put("/games/:gameId/issues", async (req, res) => {
  const { gameId } = req.params;
  const { body: issuesCSV } = req;
  log.info(`Put issues for gameId ${gameId}`);
  await storeCSVIssues({ gameId, issuesCSV });
  res.status(200).send();
})

app.get("/games/:gameId/issues", (req, res) => {
  const { gameId } = req.params;
  log.info(`Get issues for gameId ${gameId}`);
  const issuesCSV = getCSVIssues({ gameId });
  res.status(200).send(issuesCSV);
})

const service = {};

service.start = ({ port, serverUrl: _serverUrl }) => {
  log.info('Starting server');
  serverUrl = _serverUrl;
  expressServer.listen(port, () => {
    log.info(`Server listening on port ${port}`);
  });
};

module.exports = service;
