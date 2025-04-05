<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { connectWebSocket, ws, messages, sendMessage } from '../ws.js';
  import { Chess } from 'chess.js';

  export let gameCode;
  export let requestedColor;


  let color = null;
  let board;
  let game = new Chess();
  let gameOver = false;
  let status = '';
  let gamePGN = '';
  let gameFEN = '';
  let joined = false;
  let moveCounter = 0;
  let loading = true; // new flag
  let isMounted = false;
  let playerId;

  let unsubscribe;
  let unsubMessages;

  function getOrCreatePlayerId() {
    let storedId = localStorage.getItem('playerId');
    if (!storedId) {
      // Option A: Modern browsers
      if (window.crypto?.randomUUID) {
        storedId = crypto.randomUUID();
      } else {
        // Option B: Fallback to a less robust method
        storedId = 'player-' + Math.random().toString(36).substring(2);
      }
      localStorage.setItem('playerId', storedId);
    }
    return storedId;
  }

  onMount(async() => {
    isMounted = true;
        // First, check with the API whether the game exists.
      const response = await fetch(`/api/game-exists?gameCode=${gameCode}`);
      if (!response.ok) {
        // Redirect if the game doesn't exist.
        goto('/?error=Game not found. Please create a game using the home page.', { replaceState: true });
        return;
      }
      // If it exists, we remove any loading overlay and initialize.
      loading = false;
      board = Chessboard('myBoard', {
        orientation: requestedColor,
        draggable: true,
        position: 'start',
        onDragStart,
        onDrop,
        onSnapEnd,
        pieceTheme: '/chessboard/img/chesspieces/wikipedia/{piece}.png'
      });

      // Update WebSocket connection to use current host & port.
      connectWebSocket(`ws://${window.location.host}`); //REMOVE "/ws" FOR PRODUCTION

      playerId = getOrCreatePlayerId();

      // Subscribe once to the WebSocket store.
      unsubscribe = ws.subscribe(socket => {
        if (!joined && socket && socket.readyState === WebSocket.OPEN) {
          joined = true;
          console.log(color)
          socket.send(JSON.stringify({
            type: 'join',
            gameCode,
            playerId,
            requestedColor
          }));
        }
      });

      unsubMessages = messages.subscribe((allMsgs) => {
        if (!allMsgs || !allMsgs.length) return;
        const latest = allMsgs[allMsgs.length - 1];
        if (!latest) return;
        handleServerMessage(latest);
      });
  });

  onDestroy(() => {
    // Unsubscribe from both stores
    if (typeof unsubscribe === 'function') unsubscribe();
    if (typeof unsubMessages === 'function') unsubMessages();

    // Clean up the chessboard instance if it has a destroy method
    if (board && typeof board.destroy === 'function') {
      board.destroy();
    }
    board = null;

    // Now let's get the actual WebSocket from the store so we can close it
    let actualSocket;
    ws.update((currentSocket) => {
      actualSocket = currentSocket;
      return currentSocket;
    });

    if (actualSocket && actualSocket.readyState === WebSocket.OPEN) {
      // Optionally tell the server we’re leaving
      actualSocket.send(JSON.stringify({
        type: 'leave',
        playerId,
        gameCode,
      }));
      // Then close
      actualSocket.close();
    }
  });


  function onDragStart(source, piece) {
    if (gameOver) return false;
    if (!color) return false; // no color assigned yet
    if (color === 'white' && piece.search(/^b/) !== -1) return false;
    if (color === 'black' && piece.search(/^w/) !== -1) return false;
  }

  function onDrop(source, target) {
    const algebraicMove = source + target;
    moveCounter++;
    sendMessage(JSON.stringify({
      type: 'move',
      move: algebraicMove,
      moveId: moveCounter
    }));
    // return 'snapback'; // if you want to let the server handle the final position
  }

  function onSnapEnd() {}

  function handleServerMessage(raw) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return;
    }
    
    if (data.type === 'joined') {
      color = data.color;
      console.log('Server assigned color:', color);
      // Update URL if necessary:
      const url = new URL(window.location.href);
      if (url.searchParams.get('color') !== color) {
        url.searchParams.set('color', color);
        goto(url.toString(), { replaceState: true });
        board.orientation(color)
      }
      // Rebuild local game state
      game.reset();
      data.moves.forEach(m => game.move(m));
      board.position(game.fen());
      updateLocalStatus();

    } else if (data.type === 'sync' && data.moves) {
        game.reset();
        data.moves.forEach(m => game.move(m));
        board.position(game.fen());
        updateLocalStatus();
    } else if (data.code === 'INVALID_GAME_ERROR' || data.code === 'GAME_FULL_ERROR') {
        console.log(data.code)
        console.log('Server error:', data.message);
        goto(`/?error=${encodeURIComponent(data.message)}`, { replaceState: true }); 
        return;    
    } else if (data.type === 'error') {
        console.log('Server error:', data.message);
        board.position(game.fen());
    }
  }

  function updateLocalStatus() {
    if (game.isCheckmate()) {
      const winnerColor = game.turn() === 'w' ? 'Black' : 'White'; // Call game.turn()
      status = `Checkmate! ${winnerColor} won!`;
      gameOver = true;
    } else if (game.isDraw()) {
      status = 'Draw!';
      gameOver = true;
    } else {
      const nextColor = (game.turn() === 'w') ? 'white' : 'black';
      status = `${nextColor} to move`;
      if (game.isCheck()) {
        status += ' (in check)';
      }
    }
    gamePGN = game.pgn();
    gameFEN = game.fen();
  }
</script>

<style>
  @import '/chessboard/css/chessboard-1.0.0.min.css';
</style>

<main>
  <h1>{color ? color : 'Awaiting color...'} Board :)</h1>
    <div id="myBoard" style="width:400px;"></div>
  
  <div>
    <h2>Status: {status}</h2>
    <h3>PGN: {gamePGN}</h3>
    <h3>FEN: {gameFEN}</h3>
    {#if status === 'Checkmate!'}
    <p>{'j'}</p>
	    <p>{'White won'}</p>
    {/if}
  </div>
</main>
