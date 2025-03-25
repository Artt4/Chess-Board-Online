<!-- src/routes/game/[gameCode]/+page.svelte -->
<script>
    import { redirect } from '@sveltejs/kit';
    import { page } from '$app/stores';
    import ChessBoard from '../../ChessBoard.svelte';
  
    // The route param
    $: gameCode = $page.params.gamecode;
  
    // The query param "color"
    $: colorParam = $page.url.searchParams.get('color');
    // If it's "random," we randomly pick "white" or "black"
    $: requestedColor = (colorParam === 'random')
      ? (Math.random() < 0.5 ? 'white' : 'black')
      : (colorParam === 'black' ? 'black' : 'white');
    // ^ if param was missing or something else, default to white
  
  </script>
  
  <main>
    <h1>Game code: {gameCode}</h1>
    <!-- Pass requestedColor to ChessBoard -->
    <ChessBoard {gameCode} {requestedColor} />
  </main>
  