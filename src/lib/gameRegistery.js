// gameRegistry.js
import { Chess } from 'chess.js';

export const games = new Map();

// Add a unique property to help confirm the module instance
games._instanceId = Math.random().toString(36).substring(2);

// Optionally, export helper functions if needed
export function getOrCreateGame(gameCode) {
if (!games.has(gameCode)) {
  games.set(gameCode, {
    chess: new Chess(),
    moveHistory: [],
    clients: new Set(),
    players: { white: null, black: null }
  });
}
}
