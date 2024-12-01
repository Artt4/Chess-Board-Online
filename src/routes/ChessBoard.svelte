<script>
    import { onMount } from 'svelte';
    import { Chess } from 'chess.js'; // Import the Chess class
    import { connectWebSocket, sendMessage, messages } from '../ws.js'; // Import WebSocket functions

  
    let board;
    let game = new Chess(); // Initialize the chess game
    let gameHasStarted = true;
    let gameOver = false;
    let playerColor = 'white';
    let status = ''; // Initialize the gameStatus variable
    let gamePGN = ''; // Initialize the gamePGN variable
    let gameFEN = '';
  
    // Initialize the chessboard after component mount
    onMount(() => {
      board = Chessboard('myBoard', {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: '/chessboard/img/chesspieces/wikipedia/{piece}.png',
      });
      connectWebSocket(); // Connect to the WebSocket server
    });

    const onDragStart = (source, piece, position, orientation) => {
        // do not pick up pieces if the game is over
        if (game.isGameOver()) return false;
        if (!gameHasStarted) return false;
        if (gameOver) return false;

        if ((playerColor === 'black' && piece.search(/^w/) !== -1) || (playerColor === 'white' && piece.search(/^b/) !== -1)) {
            return false;
        }

        // only pick up pieces for the side to move
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
    };
    const onDrop = (source, target) => {
    let theMove = {
        from: source,
        to: target,
        promotion: 'q' // Always promote to a queen for simplicity
    };

    try {
        // Try making the move using chess.js
        const move = game.move(theMove);

        // If the move is invalid, revert the piece
        if (move === null) {
            console.log("Invalid move has been made");
            return 'snapback';
        }

        // Update the game status after the move
        updateStatus();
        playerColor = (game.turn() === 'w') ? 'white' : 'black';
    } catch (error) {
        console.error("Invalid move has been made", error);
        return 'snapback';
    }
};
    // Update the board position after the piece snap
    function onSnapEnd() {
        board.position(game.fen());
}

  function updateStatus() {

    // checkmate?
  if (game.isCheckmate()) {
    status = 'Game over, ' + playerColor + ' is in checkmate.'
  }

  // draw?
  else if (game.isDraw()) {
    status = 'Game over, drawn position'
  }

  // game still on
  else {
    status = playerColor + ' to move'

    // check?
    if (game.isCheck()) {
      status += ', ' + playerColor + ' is in check'
    }
  }

    // Use playerColor to update the status
    gamePGN = game.pgn(); // Update the PGN with the current game state
    gameFEN = game.fen(); // Update the FEN with the current game state
}

  </script>

    <style>
        @import '/chessboard/css/chessboard-1.0.0.min.css';  /* Load chessboard CSS */
    </style>
  
  <main>
    <h1>Welcome to Chess</h1>
    <div id="myBoard" style="width: 400px;"></div>

    <!-- Display game status and PGN -->
    <div>
        <h2>Status: {status}</h2>
        <h3>PGN: {gamePGN}</h3>
        <h3>FEN: {gameFEN}</h3>

    </div>
</main>

  