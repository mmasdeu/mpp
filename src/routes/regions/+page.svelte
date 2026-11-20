<script lang="ts">
	// The list of regions now lives on the home page; this keeps old links and bookmarks working.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	onMount(() => goto(`${base}/`, { replaceState: true }));
</script>

<svelte:head><title>Regions · Montserrat Pam a Pam</title><meta http-equiv="refresh" content="0; url={base}/" /></svelte:head>
<p>Les regions són a la <a href="{base}/">pàgina d'inici</a>.</p>
