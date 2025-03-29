// src/ws.js
import { writable } from 'svelte/store';

// Store for the current WebSocket instance
export const ws = writable(null);

// Store for all incoming messages (as raw strings)
export const messages = writable([]);

/**
 * Connects to the specified WebSocket URL
 */
export function connectWebSocket() {
  // Build the WebSocket URL based on the current location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}` //REMOVE "/ws" FOR PRODUCTION

  console.log('Attempting to connect WebSocket to:', wsUrl);
  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('WebSocket connected');
    ws.set(socket);
  };

  socket.onmessage = (event) => {
    messages.update((msgs) => [...msgs, event.data]);
  };

  socket.onclose = () => {
    console.log('WebSocket closed');
    ws.set(null);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}


/**
 * Sends a message over the WebSocket (if connected)
 */
export function sendMessage(message) {
  ws.update((socket) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
    return socket;
  });
}
