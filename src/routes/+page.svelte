<script>
    import { onMount } from 'svelte';
  
    let ws;
    let messages = [];
    let inputMessage = '';
  
    onMount(() => {
      // Initialize WebSocket connection
      ws = new WebSocket('ws://localhost:3001');
  
      // Event listener for receiving messages
      ws.onmessage = (event) => {
        console.log('Message received:', event.data);
        if (event.data) {
          messages = [...messages, event.data];
        }
      };
  
      // Event listener for WebSocket connection open
      ws.onopen = () => {
        console.log('WebSocket connection established');
      };
  
      // Event listener for WebSocket connection close
      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };
  
      // Cleanup WebSocket connection when component is destroyed
      return () => ws.close();
    });
  
    function sendMessage() {
      if (inputMessage && ws.readyState === WebSocket.OPEN) {
        ws.send(inputMessage);
        inputMessage = ''; // Clear the input after sending
      }
    }
  </script>
  
  <main>
    <h1>Welcome to SvelteKit</h1>
    <p>WebSocket test</p>
  
    <input bind:value={inputMessage} placeholder="Type a message" />
    <button on:click={sendMessage}>Send</button>
  
    <h2>Messages:</h2>
    <ul>
      {#each messages as message}
        <li>{message}</li>
      {/each}
    </ul>
  </main>
  