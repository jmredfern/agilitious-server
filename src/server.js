'use strict';

const { createServer } = require('http');
const express = require('express');
const logger = require('./logger.js');
const path = require('path');
const WebSocket = require('ws');
const exphbs = require('express-handlebars');
const { Machine, interpret } = require('xstate');
const hardCodedIssues = require('../data/issues.json');
const uuid = require('uuid');
const inspect = require('util').inspect;
inspect.defaultOptions = { depth: 16, compact: false, breakLength: Infinity };

const log = logger.getLoggerByFilename({ filename: __filename });

const app = express();

const expressServer = createServer(app);
const wss = new WebSocket.Server({ server: expressServer });
const FSMs = {};

let serverUrl;

const getPlayersState = players => {
  return Object.values(players).map(({ playerId, playerOrder, websocket }) => ({
    id: playerId,
    connected: websocket.readyState === WebSocket.OPEN, // possible options are CONNECTING, OPEN, CLOSING or CLOSED
    playerOrder,
  }));
};

const sendJSObject = (websocket, object) => {
  websocket.send(JSON.stringify(object));
}

const sendGameState = ({ activePlayerId, gameId, issues, gameOwnerId, players }) => {
  Object.values(players).forEach(({ playerId, websocket }) => {
    sendJSObject(websocket, {
      gameState: {
        phase: 0, // TODO
        activePlayerId,
        gameId,
        gameOwnerId,
        playerId,
        players: getPlayersState(players),
        issues,
      },
    });
  });
};

const createGameFSM = ({ gameId, gameOwnerId }) => {
  const gameMachine = Machine(
    {
      context: {
        gameId,
        issues: hardCodedIssues.issues,
        gameOwnerId,
        players: {},
      },
      id: 'gameFSM',
      initial: 'start',
      states: {
        start: {
          on: {
            JOIN_GAME: {
              target: 'active',
              actions: ['addPlayer'],
            },
          }
        },
        active: {
          on: {
            JOIN_GAME: {
              target: 'active',
              actions: ['addPlayer'],
            },
          }
        },
        finish: {
          type: 'final'
        },
      },
    },
    {
      actions: {
        addPlayer: (context, { playerId, websocket }) => {
          const { players } = context;
          const playerOrder = Object.keys(players).length;
          players[playerId] = {
            playerId,
            playerOrder,
            websocket
          };
          if (playerOrder === 0) {
            context.activePlayerId = playerId;
          }
          sendGameState(context);
        }
      },
      activities: {
        /* ... */
      },
      guards: {
        /* ... */
      },
      services: {
        /* ... */
      }
    },
  );
  const gameService = interpret(gameMachine).onTransition(state =>
    log.info(state.value)
  );
  gameService.start();
  return gameService;
}

const getGameFSM = ({ gameId, playerId }) => {
  if (!FSMs[gameId]) {
    const gameFSM = createGameFSM({
      gameId,
      gameOwnerId: playerId,
    });
    FSMs[gameId] = gameFSM;
  }
  
  return FSMs[gameId];
}

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

const server = {};

server.start = ({ port, serverUrl: _serverUrl }) => {
  log.info('Starting server');
  serverUrl = _serverUrl;
  expressServer.listen(port, () => {
    log.info(`Server listening on port ${port}`);
  });
};

// app.post('/click', (req, res) => {
//   log.info('Click received');
//   toggleService.send('TOGGLE');
//   // processClick({ websocket });
//   res.status(200).send();
// })

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

module.exports = server;
