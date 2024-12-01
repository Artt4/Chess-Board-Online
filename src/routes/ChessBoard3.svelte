<script>
    import { onMount } from 'svelte';
    import { Chess } from 'chess.js'; // Import the chess.js library directly
    let board;
    let game;
    let status = '';
    let fen = '';
    let pgn = '';
  
    onMount(() => {
      // Initialize chess game and board
      game = new Chess();
      board = Chessboard('myBoard', {
        draggable: true,
        dropOffBoard: 'trash',
        sparePieces: true,
        position: 'start',
        onDragStart,
        onDrop,
        onSnapEnd,
        pieceTheme: '/chessboard/img/chesspieces/wikipedia/{piece}.png'
      });
  
      // Initialize the status, FEN, and PGN
      updateStatus();
    });
  
    function onDragStart(source, piece) {
      // Do not allow picking up pieces if the game is over
      if (game.game_over()) return false;
  
      // Only allow picking up pieces for the current side to move
      if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
          (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
      }
    }
  
    function onDrop(source, target) {
      // Try making the move and check if it's legal
      const move = game.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to a queen for simplicity
      });
  
      // If the move is illegal, snap back the piece
      if (move === null) return 'snapback';
  
      updateStatus();
    }
  
    function onSnapEnd() {
      // Update the board position after the piece has been dropped
      board.position(game.fen());
    }
  
    function updateStatus() {
      let moveColor = game.turn() === 'b' ? 'Black' : 'White';
      status = game.in_checkmate() ? `${moveColor} is in checkmate.` :
               game.in_draw() ? 'Draw!' : `${moveColor} to move`;
  
      if (game.in_check()) {
        status += `, ${moveColor} is in check.`;
      }
  
      fen = game.fen();
      pgn = game.pgn();
    }
  </script>
  
  <div>
    <div id="myBoard" style="width: 400px; height: 400px;"></div>
  
    <div>
      <label>Status:</label>
      <div>{status}</div>
    </div>
  
    <div>
      <label>FEN:</label>
      <div>{fen}</div>
    </div>
  
    <div>
      <label>PGN:</label>
      <div>{pgn}</div>
    </div>
  </div>
  
  <style>
    /* Add any necessary styles here */
  </style>
  