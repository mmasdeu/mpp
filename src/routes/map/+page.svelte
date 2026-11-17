<script lang="ts">
	import { base } from '$app/paths';
	import Map from '$lib/components/Map/Map.svelte';
</script>

<svelte:head><title>Mapa · Montserrat Pam a Pam</title></svelte:head>
<h1>Mapa</h1>
<Map geojsonUrl="{base}/generated/needles.geojson" />
