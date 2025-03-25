<script>
  import { onMount } from 'svelte';
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

  onMount(() => {
    board = Chessboard('myBoard', {
      draggable: true,
      position: 'start',
      onDragStart,
      onDrop,
      onSnapEnd,
      pieceTheme: '/chessboard/img/chesspieces/wikipedia/{piece}.png'
    });

    // Update WebSocket connection to use current host & port.
    connectWebSocket(`ws://${window.location.host}`);

    ws.subscribe(socket => {
      if (!joined && socket && socket.readyState === WebSocket.OPEN) {
        joined = true;
        socket.send(JSON.stringify({
          type: 'join',
          gameCode,
          requestedColor
        }));
      }
    });

    messages.subscribe((allMsgs) => {
      const latest = allMsgs[allMsgs.length - 1];
      if (!latest) return;
      handleServerMessage(latest);
    });
  });

  function onDragStart(source, piece) {
    if (gameOver) return false;
    if (!color) return false; // no color assigned yet
    if (color === 'white' && piece.search(/^b/) !== -1) return false;
    if (color === 'black' && piece.search(/^w/) !== -1) return false;
  }

  function onDrop(source, target) {
    console.log("%c onDrop fired EXACTLY once", "color: red;", source, "->", target);
    const algebraicMove = source + target;
    console.log("onDrop move string:", algebraicMove);
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
    console.log("handleServerMessage raw:", raw);
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
    } else if (data.type === 'error') {
      console.log('Server error:', data.message);
      board.position(game.fen());
    }
  }

  function updateLocalStatus() {
    if (game.isCheckmate()) {
      status = 'Checkmate!';
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
  <h1>{color ? color : 'Awaiting color...'} Board</h1>
  <div id="myBoard" style="width:400px;"></div>
  <div>
    <h2>Status: {status}</h2>
    <h3>PGN: {gamePGN}</h3>
    <h3>FEN: {gameFEN}</h3>
  </div>
</main>
