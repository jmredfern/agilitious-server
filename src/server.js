'use strict';

const { createServer } = require('http');
const exphbs = require('express-handlebars');
const express = require('express');
const inspect = require('util').inspect;
const logger = require('./util/logger.js');
const path = require('path');
const uuid = require('uuid');
const WebSocket = require('ws');
const { getGameFSM } = require('./services/gameFSM');

const log = logger.getLoggerByFilename({ filename: __filename });
const app = express();

const expressServer = createServer(app);
const wss = new WebSocket.Server({ server: expressServer });

let serverUrl;

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

const service = {};

service.start = ({ port, serverUrl: _serverUrl }) => {
  log.info('Starting server');
  serverUrl = _serverUrl;
  expressServer.listen(port, () => {
    log.info(`Server listening on port ${port}`);
  });
};

module.exports = service;
