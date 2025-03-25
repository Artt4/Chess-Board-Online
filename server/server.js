import { WebSocketServer } from 'ws';
import { Chess } from 'chess.js';

const wss = new WebSocketServer({ port: 4000 });
console.log('WebSocket server listening on ws://localhost:4000');

// Map: gameCode -> { chess, moveHistory, clients, players: {white, black} }
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
  // data.gameCode, data.requestedColor, etc.
  const gameCode = data.gameCode.trim();
  const gameObj = getOrCreateGame(gameCode);
  
  // store the socket in clients
  gameObj.clients.add(socket);

  // color assignment
  const requestedColor = data.requestedColor; // "white"|"black"|undefined
  if (requestedColor === 'white' || requestedColor === 'black') {
    if (!gameObj.players[requestedColor]) {
      // assign them their requested color
      gameObj.players[requestedColor] = socket;
      socket.send(JSON.stringify({
        type: 'joined',
        color: requestedColor,
        moves: gameObj.moveHistory
      }));
    } else {
      // fallback to the other color if free
      const other = (requestedColor === 'white') ? 'black' : 'white';
      if (!gameObj.players[other]) {
        gameObj.players[other] = socket;
        socket.send(JSON.stringify({
          type: 'joined',
          color: other,
          moves: gameObj.moveHistory
        }));
      } else {
        // both taken => full
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Both colors are taken; game is full'
        }));
        socket.close();
      }
    }
  } else {
    // fallback "first => white, second => black"
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
  
  return gameCode; // so we know the currentGameCode
}

// Handle "move" logic
function handleMove(data, socket, currentGameCode) {
  const gameObj = games.get(currentGameCode);
  if (!gameObj) return;

  // optional: only accept from assigned players
  if (socket !== gameObj.players.white && socket !== gameObj.players.black) {
    socket.send(JSON.stringify({
      type: 'error',
      message: 'You are not a player in this game'
    }));
    return;
  }
  
  console.log(`MOVE ID: ${data.moveId} squares: ${data.move}`);
  console.log("Before move:", gameObj.chess.fen(), "turn=", gameObj.chess.turn());

  try {
    const result = gameObj.chess.move(data.move);
    console.log("After move:", gameObj.chess.fen(), "turn=", gameObj.chess.turn());

    if (result) {
      // valid => record + broadcast
      gameObj.moveHistory.push(data.move);
      broadcastToRoom(currentGameCode, {
        type: 'sync',
        moves: gameObj.moveHistory
      });
    }
  } catch (err) {
    console.error("Invalid move from client:", data.move);
    socket.send(JSON.stringify({
      type: 'error',
      message: 'Invalid move: ' + data.move
    }));
  }
}

wss.on('connection', (socket) => {
  let currentGameCode = null;

  socket.on('message', (raw) => {
    console.log("Received raw message:", raw);
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error('Invalid JSON:', raw);
      return;
    }

    // Use data.type to branch
    if (data.type === 'join' && data.gameCode) {
      // handle the join
      currentGameCode = handleJoin(data, socket);
    } 
    else if (data.type === 'move' && data.move && currentGameCode) {
      // handle the move
      handleMove(data, socket, currentGameCode);
    }
    // else if you have other message types...
  });

  socket.on('close', () => {
    console.log('Client disconnected');
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
