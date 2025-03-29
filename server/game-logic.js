// game-logic.js

import { Chess } from 'chess.js';
import {games} from '../src/lib/gameRegistery.js';


export function handleJoin(data, socket) {
    const gameCode = data.gameCode.trim();
    if (!games.has(gameCode)) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Game not found. Please create a game using the home page.'
        }));
        socket.close();
        return;
    }
    
    const gameObj = games.get(gameCode);

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
export function handleMove(data, socket, currentGameCode) {
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
    if (games.has(gameCode)) {
        const gameObj = games.get(gameCode);
        if (gameObj.players.white === socket) {
            gameObj.players.white = null;
        } else if (gameObj.players.black === socket) {
            gameObj.players.black = null;
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