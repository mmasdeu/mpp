<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import SimView from '$lib/components/Nearby/SimView.svelte';
	// /vista/?lat=…&lon=…[&b=bearing] — read in the browser (the page is prerendered, so the query is not known at build time)
	let at = $state<{ latitude: number; longitude: number; bearing: number | null } | null>(null);
	let bad = $state(false);
	onMount(() => {
		const q = new URLSearchParams(location.search), lat = Number(q.get('lat')), lon = Number(q.get('lon')), b = q.get('b');
		if (q.get('lat') && q.get('lon') && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) at = { latitude: lat, longitude: lon, bearing: b !== null && b !== '' ? Number(b) : null };
		else bad = true;
	});
</script>

<svelte:head><title>Vista simulada · Montserrat Pam a Pam</title></svelte:head>
<h1 class="sr-only">Vista simulada</h1>
{#if at}<SimView latitude={at.latitude} longitude={at.longitude} initialBearing={at.bearing} />
{:else if bad}<p style="padding:1rem">Falta el punt. Obre el <a href="{base}/map/">mapa</a>, toca «Vista» i després el punt des d'on vols mirar.</p>{/if}
