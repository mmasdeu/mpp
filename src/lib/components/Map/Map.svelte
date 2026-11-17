<script lang="ts">
	import { onMount } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	let { geojsonUrl }: { geojsonUrl: string } = $props();
	let el: HTMLDivElement;
	let count = $state<number | null>(null);
	let failed = $state(false);

	onMount(() => {
		let map: import('maplibre-gl').Map | undefined;
		(async () => {
			const maplibre = await import('maplibre-gl');
			map = new maplibre.Map({
				container: el,
				center: [1.81, 41.6],
				zoom: 13,
				style: {
					version: 8,
					sources: { topo: { type: 'raster', tileSize: 256, tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'], maxzoom: 17,
						attribution: '© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)' } },
					layers: [{ id: 'topo', type: 'raster', source: 'topo' }]
				}
			});
			map.addControl(new maplibre.NavigationControl());
			map.on('error', () => (failed = true));
			map.on('load', async () => {
				const data = await (await fetch(geojsonUrl)).json();
				count = data.features.length;
				map!.addSource('needles', { type: 'geojson', data, cluster: true, clusterRadius: 40 });
				map!.addLayer({ id: 'clusters', type: 'circle', source: 'needles', filter: ['has', 'point_count'], paint: { 'circle-color': '#8a3b12', 'circle-radius': 16 } });
				map!.addLayer({ id: 'needle-points', type: 'circle', source: 'needles', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': '#c0561a', 'circle-radius': 6, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff' } });
			});
		})();
		return () => map?.remove();
	});
</script>

<div class="map" bind:this={el} role="region" aria-label="Mapa de Montserrat"></div>
{#if count === 0}<p>Cap agulla geolocalitzada encara: les coordenades només s'afegiran amb font i precisió documentades.</p>{/if}
{#if failed}<p>No s'han pogut carregar les rajoles del mapa. La consulta documental continua disponible.</p>{/if}
