<script>
    import { onMount } from 'svelte';
    import { Chess } from 'chess.js'; // Import the chess.js library directly
  
    let board;
    const game = new Chess(); // Initialize the chess game logic
  
    // Handle piece drop
    const onDrop = (source, target) => {
      // Attempt to make the move using chess.js
      const move = game.move({
        from: source,
        to: target,
        promotion: 'q', // Always promote to a queen for simplicity
      });
  
      // If the move is invalid, return 'snapback' to revert the piece
      if (move === null) {
        return 'snapback';
      }
  
      // Update the board with the new position
      board.position(game.fen());
  
      // Check for game over conditions
      if (game.game_over()) {
        alert('Game over!');
      }
    };
  
    // Reset the game
    const reset = () => {
      game.reset();
      board.position(game.fen()); // Update the board to reflect the reset
    };
  
    // Undo the last move
    const undo = () => {
      game.undo();
      board.position(game.fen());
    };
  
    // Handle the drag start to prevent interaction if the game is over or if the wrong player is moving
    const onDragStart = (source, piece, position, orientation) => {
      // Prevent interaction if the game is over
      if (game.game_over()) return false;
  
      // Only allow dragging pieces of the active player
      if (
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)
      ) {
        return false;
      }
    };

    const updateStatus = () => {
      let moveColor = game.turn() === 'b' ? 'Black' : 'White';
      status = game.in_checkmate() ? `${moveColor} is in checkmate.` :
        game.in_draw() ? 'Game is a draw.' :
        `${moveColor} to move`;
    };
  
    // Update the board after a move is made
    const onSnapEnd = () => {
      board.position(game.fen()); // Update the board position to reflect the current game state
    };

    var config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
}
board = Chessboard('myBoard', config)

updateStatus()
  
  </script>
  
  <style>
    @import '/chessboard/css/chessboard-1.0.0.min.css';  /* Load chessboard CSS */
  </style>
  
  <main>
    <h1>Welcome to the Chess App</h1>
    <div id="myBoard" style="width: 400px;"></div>
    <button on:click={reset}>Reset Game</button>
    <button on:click={undo}>Undo Move</button>
  </main>
  