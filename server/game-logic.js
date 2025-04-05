// game-logic.js

import { Chess } from 'chess.js';
import {games} from '../src/lib/gameRegistery.js';


export function handleJoin(data, socket) {
    const { gameCode, playerId, requestedColor } = data;
    const gameObj = games.get(gameCode);
    if (!gameObj) {
        socket.send(JSON.stringify({
          type: 'error',
          code: "INVALID_GAME_ERROR",
          message: 'Game not found. Please create a game using the home page.'
        }));
        socket.close();
        return;
    }
      // Make sure we have a map from playerId → color
    if (!gameObj.playerToColorMap) {
        gameObj.playerToColorMap = {};
    }

    // If a removal timeout was scheduled, cancel it because a player is (re)joining.
    if (gameObj.removalTimeout) {
        clearTimeout(gameObj.removalTimeout);
        gameObj.removalTimeout = null;
    }

    // If this socket is already assigned to a color, ignore the join.
    if (gameObj.players.white === socket || gameObj.players.black === socket) {
        console.log("Socket already joined for game", gameCode);
        return gameCode;
    }

    gameObj.clients.add(socket);

  // --- CASE A: Player Rejoin (they have a color from a previous connection) ---
  const existingColor = gameObj.playerToColorMap[playerId];
  if (existingColor) {
    // If there's an old socket still occupying that color, close it.
    const oldSocket = gameObj.players[existingColor];
    if (oldSocket && oldSocket !== socket && oldSocket.readyState === oldSocket.OPEN) {
      oldSocket.close();
    }
    // Reassign that color to this new socket
    gameObj.players[existingColor] = socket;

    socket.send(JSON.stringify({
      type: 'joined',
      color: existingColor,
      moves: gameObj.moveHistory
    }));

    return gameCode;
  }

  // --- CASE B: Brand-New Player ---
  // We'll assign them a color, respecting requestedColor if possible
  let finalColor = null;

  if (requestedColor === 'white' || requestedColor === 'black') {
    // Try requestedColor first
    if (!gameObj.players[requestedColor]) {
      finalColor = requestedColor;
    } else {
      // If requested color is taken, try the other color if it's free
      const otherColor = (requestedColor === 'white') ? 'black' : 'white';
      if (!gameObj.players[otherColor]) {
        finalColor = otherColor;
      } else {
        // Both are taken
        socket.send(JSON.stringify({
          type: 'error',
          code: 'GAME_FULL_ERROR',
          message: 'Both colors are taken; game is full.'
        }));
        socket.close();
        return;
      }
    }
  } else {
    // No specific color requested; pick whichever is free
    if (!gameObj.players.white) {
      finalColor = 'white';
    } else if (!gameObj.players.black) {
      finalColor = 'black';
    } else {
      // Both are taken
      socket.send(JSON.stringify({
        type: 'error',
        code: 'GAME_FULL_ERROR',
        message: 'Game is full (2 players max).'
      }));
      socket.close();
      return;
    }
  }

  // Assign finalColor to this socket
  gameObj.players[finalColor] = socket;
  // Record the mapping so if they reconnect, we reassign them to the same color
  gameObj.playerToColorMap[playerId] = finalColor;

  socket.send(JSON.stringify({
    type: 'joined',
    color: finalColor,
    moves: gameObj.moveHistory
  }));

  return gameCode;

}
export function handleMove(data, socket, currentGameCode) {
    const gameObj = games.get(currentGameCode);
    if (!gameObj) return;

    if (socket !== gameObj.players.white && socket !== gameObj.players.black) {
        socket.send(JSON.stringify({
            type: 'error',
            code: "NOT_A_PLAYER",
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
            code: "MOVE_ERROR",
            message: 'Invalid move: ' + data.move
        }));

    }
}

export function broadcastToRoom(gameCode, msgObj) {
    const gameObj = games.get(gameCode);
    if (!gameObj) return;
    const json = JSON.stringify(msgObj);
    for (const client of gameObj.clients) {
        if (client.readyState === client.OPEN) {
            client.send(json);
        }
    }
}

export function removePlayerFromGame(gameCode, socket) {
    const gameObj = games.get(gameCode);
    if (!gameObj) return;
  
    // If this socket is actually assigned to white or black, clear it
    if (gameObj.players.white === socket) {
      gameObj.players.white = null;
      // also remove from playerToColorMap if known
      for (const [pid, color] of Object.entries(gameObj.playerToColorMap)) {
        if (color === 'white') {
          delete gameObj.playerToColorMap[pid];
          break;
        }
      }
    } else if (gameObj.players.black === socket) {
      gameObj.players.black = null;
      // also remove from playerToColorMap
      for (const [pid, color] of Object.entries(gameObj.playerToColorMap)) {
        if (color === 'black') {
          delete gameObj.playerToColorMap[pid];
          break;
        }
      }
    }
}
export function removeGameIfEmpty(gameCode) {
    if (games.has(gameCode)) {
      const gameObj = games.get(gameCode);
      // Instead of immediately deleting, schedule removal if no clients remain.
      if (gameObj.clients.size === 0) {
        console.log("Game", gameCode, "is empty. Scheduling removal in 5 minutes.");
        gameObj.removalTimeout = setTimeout(() => {
          // Double-check that it's still empty before removing.
          const currentGame = games.get(gameCode);
          if (currentGame && currentGame.clients.size === 0) {
            console.log("Game", gameCode, "removed due to inactivity.");
            games.delete(gameCode);
          }
        }, 5 * 60 * 1000); // 5 minutes timeout
      }
    }
  }