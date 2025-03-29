<script>
  import { goto } from '$app/navigation';

  let userCode = '';
  let chosenColor = 'white'; // "white", "black", "random"

  async function createGame() {
    let colorToUse = chosenColor;
    if (colorToUse === 'random') {
      colorToUse = Math.random() < 0.5 ? 'white' : 'black';
    }

    // Call the API to create a new game
    const response = await fetch('/api/create-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestedColor: colorToUse})
    });

    const { gameCode } = await response.json();
    console.log(gameCode, "HELLO")
    
    // Navigate to the new game URL (you might include additional parameters if needed)
    goto(`/game/${gameCode}?color=${colorToUse}`);
  }

  function joinGame() {
    if (!userCode) return;
    goto(`/game/${userCode}?color=${chosenColor}`);
  }
</script>

<main>
  <h1>Welcome to the Chess App</h1>
  <select bind:value={chosenColor}>
    <option value="white">White</option>
    <option value="black">Black</option>
    <option value="random">Random</option>
  </select>
  <button on:click={createGame}>Create New Game</button>
  <p>OR</p>
  <div>
    <input bind:value={userCode} placeholder="Enter existing code" />
    <button on:click={joinGame}>Join Game</button>
  </div>
</main>
