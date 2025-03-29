<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let userCode = '';
  let chosenColor = 'white'; // "white", "black", or "random"
  let errorMessage = '';

  // When the component mounts, check for an error in the URL.
  onMount(() => {
    // $page.url is a URL instance provided by SvelteKit
    const urlParams = new URLSearchParams($page.url.search);
    errorMessage = urlParams.get('error') || '';

    // If there was an error, remove it from the URL so it doesn’t persist.
    if (errorMessage) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('error');
      goto(newUrl.toString(), { replaceState: true });
    }
  });

  async function createGame() {
    let colorToUse = chosenColor;
    if (colorToUse === 'random') {
      // Decide the color randomly
      colorToUse = Math.random() < 0.5 ? 'white' : 'black';
    }

    // Call the API endpoint to create a new game.
    const response = await fetch('/api/create-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestedColor: colorToUse })
    });

    if (!response.ok) {
      errorMessage = "Failed to create game. Please try again.";
      return;
    }

    const { gameCode } = await response.json();
    console.log("Game created with code:", gameCode);
    
    // Navigate to the new game URL.
    goto(`/game/${gameCode}?color=${colorToUse}`);
    
  }

  async function joinGame() {
    if (!userCode) return;
    
    // Optional: call an API to verify the game exists.
    const response = await fetch(`/api/game-exists?gameCode=${userCode}`);
    if (response.ok) {
      goto(`/game/${userCode}?color=${chosenColor}`);
    } else {
      // If game doesn't exist, show an alert or set an error.
      errorMessage = "Game not found. Please create a game using the home page.";
    }
  }
</script>

{#if errorMessage}
  <div class="error-popup">
    <p>{errorMessage}</p>
    <!-- You might add a button here to clear the error -->
  </div>
{/if}

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
    <input bind:value={userCode} placeholder="Enter existing game code" />
    <button on:click={joinGame}>Join Game</button>
  </div>
</main>

<style>
  .error-popup {
    background-color: #fdd;
    border: 1px solid #f99;
    padding: 1em;
    margin: 1em 0;
    color: #900;
  }
</style>
