<script>
    import { goto } from '$app/navigation';
    
    let userCode = '';
    let chosenColor = 'white'; // "white","black","random"
  
    function createGame() {
      const randomCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  
      // If the user selected "random," pick a real color
      if (chosenColor === 'random') {
        chosenColor = (Math.random() < 0.5) ? 'white' : 'black';
      }
  
      // Creator's link => ?color=<chosenColor>
      goto(`/game/${randomCode}?color=${chosenColor}`);
  
      // Other color link
      const friendColor = (chosenColor === 'white') ? 'black' : 'white';
      const friendLink = `/game/${randomCode}?color=${friendColor}`;
  
      console.log("Share this link with your friend:", friendLink);
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
  