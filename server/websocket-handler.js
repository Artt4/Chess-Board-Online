// server/websocket-handler.js
import { handleJoin, handleMove, removePlayerFromGame, removeGameIfEmpty } from './game-logic.js';
import {games} from '../src/lib/gameRegistery.js';

// This function is called from server-setup.js
export function setupWebSocket(wss) {
  wss.on('connection', (socket, req) => {
    console.log('New WS connection from', req.socket.remoteAddress, req.socket.remotePort);

    let currentGameCode = null;

    socket.on('message', (raw) => {
      let data;
      try {
        data = JSON.parse(raw);
      } catch (err) {
        console.error('Invalid JSON:', raw);
        return;
      }
      console.log('Message from socket:', data);

      if (data.type === 'join' && data.gameCode) {
        currentGameCode = handleJoin(data, socket); 
      } else if (data.type === 'move' && data.move && currentGameCode) {
        handleMove(data, socket, currentGameCode);
      }else if (data.type === 'leave' && data.gameCode) {
        // The client says "I'm leaving"
        removePlayerFromGame(data.gameCode, socket);
        const gameObj = games.get(data.gameCode);
        if (gameObj) {
          gameObj.clients.delete(socket);
          removeGameIfEmpty(data.gameCode);
        }
      }
    });

    socket.on('close', () => {
      console.log("Socket closed:", req.socket.remoteAddress, req.socket.remotePort);
      if (currentGameCode) {
        removePlayerFromGame(currentGameCode, socket);
        // Remove the socket from clients set
        const gameObj = games.get(currentGameCode);
        if (gameObj) {
          gameObj.clients.delete(socket);
          console.log("After removal, clients size:", gameObj.clients.size);
          removeGameIfEmpty(currentGameCode);
        }
      }
    });
    
  });
}
