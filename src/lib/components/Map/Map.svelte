<script lang="ts">
	import { onMount } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { base } from '$app/paths';
	type Props = { geojsonUrl: string; visibleIds: string[] | null; selected?: string | null };
	let { geojsonUrl, visibleIds, selected = null }: Props = $props();
	let el: HTMLDivElement;
	let count = $state<number | null>(null);
	let failed = $state(false);
	let map: import('maplibre-gl').Map | undefined;
	let ml: typeof import('maplibre-gl') | undefined;
	let ready = $state(false);
	let coords = new Map<string, [number, number]>();

	const applyFilter = () => {
		if (!map || !ready) return;
		const f = visibleIds ? (['in', ['get', 'id'], ['literal', visibleIds]] as any) : null;
		for (const l of ['needle-points', 'needle-labels']) map.setFilter(l, f ? ['all', ['!', ['has', 'point_count']], f] : ['!', ['has', 'point_count']]);
	};
	$effect(() => { visibleIds; ready; applyFilter(); });
	$effect(() => {
		if (!ready || !selected || !map) return;
		const c = coords.get(selected);
		if (c) map.flyTo({ center: c, zoom: Math.max(map.getZoom(), 16) });
	});

	onMount(() => {
		(async () => {
			ml = await import('maplibre-gl');
			map = new ml.Map({
				container: el, center: [1.81, 41.6], zoom: 13,
				style: { version: 8, glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
					sources: { topo: { type: 'raster', tileSize: 256, tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'], maxzoom: 17, attribution: '© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)' } },
					layers: [{ id: 'topo', type: 'raster', source: 'topo' }] }
			});
			map.addControl(new ml.NavigationControl());
			(window as any).__map = map;
			map.addControl(new ml.GeolocateControl({ trackUserLocation: false }));
			map.on('error', () => (failed = true));
			// 'style.load' (not 'load'): markers must not wait for basemap tiles, which may be unavailable.
			map.once('style.load', async () => {
				const data = await (await fetch(geojsonUrl)).json();
				count = data.features.length;
				coords = new Map(data.features.map((f: any) => [f.properties.id, f.geometry.coordinates]));
				map!.addSource('needles', { type: 'geojson', data, cluster: true, clusterRadius: 40, clusterMaxZoom: 15 });
				map!.addLayer({ id: 'clusters', type: 'circle', source: 'needles', filter: ['has', 'point_count'], paint: { 'circle-color': '#8a3b12', 'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 50, 24] } });
				map!.addLayer({ id: 'cluster-count', type: 'symbol', source: 'needles', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#fff' } });
				map!.addLayer({ id: 'needle-points', type: 'circle', source: 'needles', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': '#c0561a', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 17, 9], 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff' } });
				map!.addLayer({ id: 'needle-labels', type: 'symbol', source: 'needles', minzoom: 15, filter: ['!', ['has', 'point_count']], layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.2], 'text-optional': true }, paint: { 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });
				map!.on('click', 'clusters', async (e) => {
					const f = map!.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
					const zoom = await (map!.getSource('needles') as any).getClusterExpansionZoom(f.properties.cluster_id);
					map!.easeTo({ center: (f.geometry as any).coordinates, zoom });
				});
				map!.on('click', 'needle-points', (e) => {
					const p = e.features![0].properties as any;
					const box = document.createElement('div');
					const a = document.createElement('a');
					a.href = `${base}/needles/${p.id}/`; a.textContent = p.name;
					box.append(a);
					new ml!.Popup().setLngLat((e.features![0].geometry as any).coordinates).setDOMContent(box).addTo(map!);
				});
				for (const l of ['clusters', 'needle-points']) {
					map!.on('mouseenter', l, () => (map!.getCanvas().style.cursor = 'pointer'));
					map!.on('mouseleave', l, () => (map!.getCanvas().style.cursor = ''));
				}
				ready = true;
			});
		})();
		return () => map?.remove();
	});
</script>

<div class="map" bind:this={el} role="region" aria-label="Mapa de Montserrat"></div>
{#if count === 0}<p class="muted">Cap agulla geolocalitzada encara: les coordenades només s'afegiran amb font i precisió documentades. Les agulles continuen accessibles a la llista següent.</p>{/if}
{#if failed}<p class="muted">No s'han pogut carregar les rajoles del mapa. La consulta documental continua disponible.</p>{/if}
