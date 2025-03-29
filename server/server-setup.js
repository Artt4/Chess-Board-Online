// server/server-setup.js
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { handler } from '../build/handler.js';
import crypto from 'crypto';
import {getOrCreateGame, games} from '../src/lib/gameRegistery.js';
import { setupWebSocket } from './websocket-handler.js';

export function createServerApp() {
  // 1) Create an Express app
  const app = express();

  // Add JSON parsing middleware for API routes
  app.use(express.json());

  // Define the API endpoint directly in Express
  app.post('/api/create-game', (req, res) => {
    const { requestedColor } = req.body;

    // Generate a new game code
    let gameCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    
    // Check if the code already exists; if so, generate a new one
    while (games.has(gameCode)) {
      gameCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    }

    // Create and store the game using your shared registry
    getOrCreateGame(gameCode);
    console.log("Game created with code:", gameCode);

    res.json({ gameCode, requestedColor });
  });

  // Let SvelteKit handle the rest of the routes
  app.use(handler);

  // 3) Create the HTTP server
  const server = createServer(app);

  // 4) Attach the WebSocketServer
  const wss = new WebSocketServer({ server });
  setupWebSocket(wss);

  return { server, app };
}

export function startServer(server, port) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`Server is listening on port ${port}`);
  });
}
