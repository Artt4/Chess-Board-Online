<script>
	// SvelteKit store that gives access to the current page URL
	import { page } from '$app/stores';
	import ChessBoard from './ChessBoard.svelte';

	// If the query param is missing or not "black", default to "white"
	$: color = $page.url.searchParams.get('color') === 'black'
		? 'black'
		: 'white';
</script>

<main>
	<h1>Welcome to the Chess App</h1>
	<!-- Pass "color" as a prop to the ChessBoard component -->
	<ChessBoard color={color} />
</main>
