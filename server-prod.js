console.log("Starting server-prod.js...");

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { handler } from './build/handler.js'; // SvelteKit production handler from your build output

console.log("Imported handler from build/handler.js...");

import { Chess } from 'chess.js';


const app = express();

// Use SvelteKit's production handler for HTTP requests
app.use(handler);

// Create an HTTP server that uses the Express app
const server = createServer(app);

// Attach the WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });
console.log('WebSocket server attached.');

const games = new Map();

// Helper to broadcast a message to all sockets in this game
function broadcastToRoom(gameCode, msgObj) {
  const gameObj = games.get(gameCode);
  if (!gameObj) return;
  const json = JSON.stringify(msgObj);
  for (const client of gameObj.clients) {
    if (client.readyState === client.OPEN) {
      client.send(json);
    }
  }
}

// Helper to create or retrieve the game object
function getOrCreateGame(gameCode) {
    if (!games.has(gameCode)) {
      games.set(gameCode, {
        chess: new Chess(),
        moveHistory: [],
        clients: new Set(),
        players: { white: null, black: null }
      });
    }
    return games.get(gameCode);
  }
  

// Handle "join" logic
function handleJoin(data, socket) {
  const gameCode = data.gameCode.trim();
  const gameObj = getOrCreateGame(gameCode);
  gameObj.clients.add(socket);
  const requestedColor = data.requestedColor; // "white"|"black"|undefined

  if (requestedColor === 'white' || requestedColor === 'black') {
    if (!gameObj.players[requestedColor]) {
      gameObj.players[requestedColor] = socket;
      socket.send(JSON.stringify({
        type: 'joined',
        color: requestedColor,
        moves: gameObj.moveHistory
      }));
    } else {
      const other = requestedColor === 'white' ? 'black' : 'white';
      if (!gameObj.players[other]) {
        gameObj.players[other] = socket;
        socket.send(JSON.stringify({
          type: 'joined',
          color: other,
          moves: gameObj.moveHistory
        }));
      } else {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Both colors are taken; game is full'
        }));
        socket.close();
      }
    }
  } else {
    if (!gameObj.players.white) {
      gameObj.players.white = socket;
      socket.send(JSON.stringify({
        type: 'joined',
        color: 'white',
        moves: gameObj.moveHistory
      }));
    } else if (!gameObj.players.black) {
      gameObj.players.black = socket;
      socket.send(JSON.stringify({
        type: 'joined',
        color: 'black',
        moves: gameObj.moveHistory
      }));
    } else {
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Game is full (2 players max)'
      }));
      socket.close();
    }
  }
  return gameCode;
}

// Handle "move" logic
function handleMove(data, socket, currentGameCode) {
  const gameObj = games.get(currentGameCode);
  if (!gameObj) return;

  if (socket !== gameObj.players.white && socket !== gameObj.players.black) {
    socket.send(JSON.stringify({
      type: 'error',
      message: 'You are not a player in this game'
    }));
    return;
  }

  try {
    const result = gameObj.chess.move(data.move);
    if (result) {
      gameObj.moveHistory.push(data.move);
      broadcastToRoom(currentGameCode, {
        type: 'sync',
        moves: gameObj.moveHistory
      });
    }
  } catch (err) {
    socket.send(JSON.stringify({
      type: 'error',
      message: 'Invalid move: ' + data.move
    }));
  }
}

wss.on('connection', (socket) => {
  let currentGameCode = null;

  socket.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error('Invalid JSON:', raw);
      return;
    }

    if (data.type === 'join' && data.gameCode) {
      currentGameCode = handleJoin(data, socket);
    } else if (data.type === 'move' && data.move && currentGameCode) {
      handleMove(data, socket, currentGameCode);
    }
  });

  socket.on('close', () => {
    if (currentGameCode && games.has(currentGameCode)) {
      const gameObj = games.get(currentGameCode);
      gameObj.clients.delete(socket);
      if (gameObj.players.white === socket) {
        gameObj.players.white = null;
      } else if (gameObj.players.black === socket) {
        gameObj.players.black = null;
      }
      if (gameObj.clients.size === 0) {
        games.delete(currentGameCode);
      }
    }
  });
});

// Listen on the port specified by Cloud Run
const port = process.env.PORT || 8080;
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is listening on port ${port}`);
});
