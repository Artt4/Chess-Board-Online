// src/websocket.js
import { writable } from 'svelte/store';

export const ws = writable(null);
export const messages = writable([]);

export function connectWebSocket() {
    console.log('Attempting to connect WebSocket...'); // Add this line for debugging
    const socket = new WebSocket('wss://savvy-octagon-440913-t3.ey.r.appspot.com'); // replace with your WebSocket URL

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

export function sendMessage(message) {
  ws.update((socket) => {
    if (socket) {
      socket.send(message);
    }
    return socket;
  });
}
