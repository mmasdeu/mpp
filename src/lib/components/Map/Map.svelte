<script lang="ts">
	import { onMount } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { base as basePath } from '$app/paths';
	import { goto } from '$app/navigation';
	import Icon from '$lib/ui/Icon.svelte';
	import { REGION_COLORS } from '$lib/ui/regions';
	import { net } from '$lib/pwa/offline.svelte';
	import { BASEMAPS, DEMS, GLYPHS, MONTSERRAT_BOUNDS, TERRAIN_EXAGGERATION, basemap as findBasemap, type BasemapId } from './config';

	type Padding = { top: number; right: number; bottom: number; left: number };
	type Props = {
		/** located needles (built from the bundled dataset, so the map works offline and reflects editor changes) */
		data: GeoJSON.FeatureCollection<GeoJSON.Point>;
		/** null = all needles */
		visibleIds?: string[] | null;
		selected?: string | null;
		/** called when the user picks a needle (or clicks empty map → null). Without it, a popup with a link opens. */
		onselect?: (id: string | null) => void;
		/** needles to frame (e.g. a section's located needles) when nothing is selected */
		focusIds?: string[] | null;
		basemapId?: BasemapId;
		terrain?: boolean;
		/** space covered by overlays (side panel, bottom sheet), so camera moves keep needles visible */
		padding?: Padding;
		compact?: boolean;
		label?: string;
		/** editor: when set, a click on the map places a draggable pin instead of selecting; the pin position is reported here */
		placing?: boolean;
		pin?: [number, number] | null;
	};
	let { data, visibleIds = null, selected = null, onselect, focusIds = null, basemapId = $bindable('topo'), terrain = $bindable(false),
		padding = { top: 40, right: 40, bottom: 40, left: 40 }, compact = false, label = 'Mapa de Montserrat', placing = false, pin = $bindable(null) }: Props = $props();

	let el: HTMLDivElement;
	let map: import('maplibre-gl').Map | undefined;
	let ml: typeof import('maplibre-gl') | undefined;
	let ready = $state(false);
	let tileErrors = $state(0);
	let count = $state<number | null>(null);
	let layersOpen = $state(false);
	let picking = $state(false);   // «Vista»: the next click on the map opens the simulated view from that point
	let demIndex = 0;
	let all: GeoJSON.FeatureCollection<GeoJSON.Point> | null = null;
	let coords = new Map<string, [number, number]>();

	const regionColor: any = ['match', ['get', 'regionId'], ...Object.entries(REGION_COLORS).flat(), '#b4532a'];
	const pad = () => padding;

	function boundsOf(ids: Iterable<string> | null) {
		if (!ml) return null;
		const b = new ml.LngLatBounds();
		let n = 0;
		for (const id of ids ?? coords.keys()) { const c = coords.get(id); if (c) { b.extend(c); n++; } }
		return n ? b : null;
	}
	function frame(ids: Iterable<string> | null, animate = true) {
		if (!map) return;
		const b = boundsOf(ids);
		if (b) map.fitBounds(b, { padding: pad(), maxZoom: 16, duration: animate ? 700 : 0 });
	}

	// ── reactive bindings ──
	const applyFilter = () => {
		if (!map || !ready || !all) return;
		const keep = visibleIds ? new Set(visibleIds) : null;
		(map.getSource('needles') as any)?.setData(keep ? { ...all, features: all.features.filter((f) => keep.has(f.properties!.id)) } : all);
	};
	$effect(() => { if (ready && data !== all) { all = data; coords = new Map(data.features.map((f: any) => [f.properties.id, f.geometry.coordinates])); } applyFilter(); visibleIds; });

	$effect(() => {
		const id = selected ?? '';
		if (!ready || !map) return;
		map.setFilter('selected-halo', ['==', ['get', 'id'], id]);
		map.setFilter('selected-label', ['==', ['get', 'id'], id]);
		map.setFilter('needle-labels', ['!=', ['get', 'id'], id]);
		const c = coords.get(id);
		if (c) map.easeTo({ center: c, zoom: Math.max(map.getZoom(), compact ? 15 : 15.5), padding: pad(), duration: 700 });
	});

	// mini maps: needles outside the focus set (other sections/regions) are drawn faded
	$effect(() => {
		if (!ready || !map || !compact) return;
		const ids = focusIds?.length ? focusIds : selected ? [selected] : null;
		const op: any = ids ? ['case', ['in', ['get', 'id'], ['literal', ids]], 1, 0.3] : 1;
		map.setPaintProperty('needle-points', 'circle-opacity', op);
		map.setPaintProperty('needle-points', 'circle-stroke-opacity', op);
	});

	let lastFocus = '';
	$effect(() => {
		const key = (focusIds ?? []).join(',');
		if (!ready || !map || !key || key === lastFocus) return;
		lastFocus = key;
		if (!selected || !coords.has(selected)) frame(focusIds);
	});

	let appliedBase = '';
	let appliedTerrain = false;
	$effect(() => { if (ready && basemapId !== appliedBase) setBasemap(); });
	$effect(() => { if (ready && terrain !== appliedTerrain) setTerrain(); });

	function setBasemap() {
		if (!map) return;
		const b = findBasemap(basemapId);
		appliedBase = basemapId;
		if (map.getLayer('base')) map.removeLayer('base');
		if (map.getSource('base')) map.removeSource('base');
		map.addSource('base', { type: 'raster', tileSize: 256, tiles: b.tiles, maxzoom: b.maxzoom, attribution: b.attribution });
		// directly above the background layer, below everything else
		const above = map.getStyle().layers.find((l) => l.id !== 'bg')?.id;
		map.addLayer({ id: 'base', type: 'raster', source: 'base', paint: { 'raster-fade-duration': 150 } }, above);
		tileErrors = 0;
	}

	function addDem() {
		if (!map) return;
		const d = DEMS[demIndex];
		const src = { type: 'raster-dem' as const, tiles: d.tiles, tileSize: d.tileSize, encoding: d.encoding, minzoom: d.minzoom, maxzoom: d.maxzoom, attribution: d.attribution };
		// MapLibre recommends separate sources for terrain and hillshade
		map.addSource('dem', src);
		map.addSource('dem-hs', src);
		map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'dem-hs', paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#3b2a1e' } }, 'needle-points');
	}
	function removeDem() {
		if (!map) return;
		map.setTerrain(null);
		if (map.getLayer('hillshade')) map.removeLayer('hillshade');
		for (const s of ['dem', 'dem-hs']) if (map.getSource(s)) map.removeSource(s);
	}
	function setTerrain() {
		if (!map) return;
		appliedTerrain = terrain;
		if (terrain) {
			if (!map.getSource('dem')) addDem();
			map.setTerrain({ source: 'dem', exaggeration: TERRAIN_EXAGGERATION });
			map.setSky({ 'sky-color': '#8fb8de', 'horizon-color': '#e9eef2', 'fog-color': '#efe9e0', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.4, 'atmosphere-blend': 0.6 });
			map.setMaxPitch(80);
			map.easeTo({ pitch: compact ? 55 : 62, bearing: map.getBearing() || -20, duration: 900, padding: pad() });
		} else {
			removeDem();
			map.easeTo({ pitch: 0, bearing: 0, duration: 700, padding: pad() });
		}
	}

	// editor pin: a draggable marker that follows `pin`
	let marker: import('maplibre-gl').Marker | undefined;
	$effect(() => {
		const p = pin;
		if (!ready || !map || !ml) return;
		if (!p) { marker?.remove(); marker = undefined; return; }
		if (!marker) {
			marker = new ml.Marker({ draggable: true, color: '#d97706' }).setLngLat(p).addTo(map);
			marker.on('dragend', () => { const l = marker!.getLngLat(); pin = [+l.lng.toFixed(7), +l.lat.toFixed(7)]; });
		} else marker.setLngLat(p);
		if (!map.getBounds().contains(p)) map.easeTo({ center: p, padding: pad(), duration: 600 });
	});
	$effect(() => { if (ready && map) map.getCanvas().style.cursor = placing || picking ? 'crosshair' : ''; });

	function recenter() { selected && coords.has(selected) ? map?.easeTo({ center: coords.get(selected)!, zoom: 16, padding: pad() }) : frame(visibleIds ?? null); }

	onMount(() => {
		let disposed = false;
		(async () => {
			ml = await import('maplibre-gl');
			if (disposed) return;
			map = new ml.Map({
				container: el, bounds: MONTSERRAT_BOUNDS, maxZoom: 18.5, attributionControl: false, cooperativeGestures: compact,
				style: { version: 8, glyphs: GLYPHS, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#ece6dc' } }] }
			});
			map.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right');
			map.addControl(new ml.NavigationControl({ visualizePitch: true, showCompass: true }), 'top-right');
			if (!compact) map.addControl(new ml.GeolocateControl({ trackUserLocation: false, fitBoundsOptions: { maxZoom: 16 } }), 'top-right');
			if (!compact) map.addControl(new ml.ScaleControl({ unit: 'metric' }), 'bottom-right');
			(window as any).__map = map;
			map.on('error', (e: any) => { if (e?.sourceId === 'base' || /tile|fetch|load/i.test(String(e?.error?.message ?? ''))) tileErrors++;
				// DEM unreachable: try the next elevation model once
				if (e?.sourceId === 'dem' && terrain && navigator.onLine && demIndex < DEMS.length - 1) { demIndex++; removeDem(); setTerrain(); } });
			// 'style.load' (not 'load'): points must not wait for basemap tiles, which may be unavailable offline.
			map.once('style.load', async () => {
				setBasemap();
				if (disposed || !map) return;
				all = data;
				count = data.features.length;
				coords = new Map(data.features.map((f: any) => [f.properties.id, f.geometry.coordinates]));
				map.addSource('needles', { type: 'geojson', data });
				map.addLayer({ id: 'selected-halo', type: 'circle', source: 'needles', filter: ['==', ['get', 'id'], ''],
					paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 10, 17, 18], 'circle-color': regionColor, 'circle-opacity': 0.22, 'circle-stroke-width': 2.5, 'circle-stroke-color': regionColor } });
				map.addLayer({ id: 'needle-points', type: 'circle', source: 'needles',
					paint: { 'circle-color': regionColor, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3.5, 14, 5.5, 17, 9], 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 16, 2], 'circle-stroke-color': '#fff' } });
				map.addLayer({ id: 'needle-hit', type: 'circle', source: 'needles', paint: { 'circle-radius': 16, 'circle-opacity': 0 } });
				map.addLayer({ id: 'needle-labels', type: 'symbol', source: 'needles', minzoom: compact ? 15 : 14.3,
					layout: { 'text-field': ['get', 'name'], 'text-size': ['interpolate', ['linear'], ['zoom'], 14, 11, 17, 13.5], 'text-variable-anchor': ['top', 'bottom', 'left', 'right'], 'text-radial-offset': 0.75, 'text-justify': 'auto', 'text-max-width': 8, 'text-optional': true },
					paint: { 'text-color': '#2a2018', 'text-halo-color': 'rgba(255,255,255,.92)', 'text-halo-width': 1.6 } });
				map.addLayer({ id: 'selected-label', type: 'symbol', source: 'needles', filter: ['==', ['get', 'id'], ''],
					layout: { 'text-field': ['get', 'name'], 'text-size': 14, 'text-anchor': 'top', 'text-offset': [0, 1.1], 'text-allow-overlap': true },
					paint: { 'text-color': '#1a120c', 'text-halo-color': '#fff', 'text-halo-width': 2.2 } });

				const hover = new ml!.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'needle-tip' });
				map.on('mousemove', 'needle-hit', (e) => {
					if (!placing) map!.getCanvas().style.cursor = 'pointer';
					const f = e.features![0];
					hover.setLngLat((f.geometry as any).coordinates).setText(String(f.properties!.name)).addTo(map!);
				});
				map.on('mouseleave', 'needle-hit', () => { map!.getCanvas().style.cursor = placing ? 'crosshair' : ''; hover.remove(); });
				map.on('click', (e) => {
					const f = map!.queryRenderedFeatures(e.point, { layers: ['needle-hit'] })[0];
					hover.remove();
					if (placing) { pin = [+e.lngLat.lng.toFixed(7), +e.lngLat.lat.toFixed(7)]; return; }
					if (picking) { picking = false; goto(`${basePath}/vista/?lat=${e.lngLat.lat.toFixed(6)}&lon=${e.lngLat.lng.toFixed(6)}`); return; }
					if (onselect) { onselect(f ? String(f.properties!.id) : null); return; }
					if (!f) return;
					const a = document.createElement('a');
					a.href = `${basePath}/needles/${f.properties!.id}/`; a.textContent = String(f.properties!.name);
					new ml!.Popup({ offset: 12 }).setLngLat((f.geometry as any).coordinates).setDOMContent(a).addTo(map!);
				});
				ready = true;
				// initial camera: selected needle › focus set › everything
				const c = selected ? coords.get(selected) : undefined;
				if (c) map.jumpTo({ center: c, zoom: compact ? 15 : 15.5, padding: pad() });
				else if (focusIds?.length && boundsOf(focusIds)) { lastFocus = focusIds.join(','); frame(focusIds, false); }
				else frame(visibleIds ?? null, false);
			});
		})();
		return () => { disposed = true; map?.remove(); };
	});
</script>

<div class="map-wrap" class:compact>
	<div class="map" bind:this={el} role="region" aria-label={label}></div>
	<div class="map-tools" role="toolbar" aria-label="Opcions del mapa">
		<button type="button" class="tool" class:on={terrain} aria-pressed={terrain} onclick={() => (terrain = !terrain)} title="Relleu 3D">
			<Icon name="cube" size={18} /><span>3D</span>
		</button>
		{#if !compact}
			<button type="button" class="tool" aria-expanded={layersOpen} aria-controls="basemaps" onclick={() => (layersOpen = !layersOpen)} title="Mapa de fons">
				<Icon name="layers" size={18} /><span class="sr-only">Mapa de fons</span>
			</button>
			<button type="button" class="tool" class:on={picking} aria-pressed={picking} onclick={() => (picking = !picking)} title="Vista simulada: toca un punt del mapa" data-testid="pick-view">
				<Icon name="eye" size={18} /><span>Vista</span>
			</button>
			<button type="button" class="tool" onclick={recenter} title="Centra"><Icon name="expand" size={18} /><span class="sr-only">Centra el mapa</span></button>
		{/if}
		{#if layersOpen}
			<fieldset id="basemaps" class="basemaps">
				<legend>Mapa de fons</legend>
				{#each BASEMAPS as b (b.id)}
					<label><input type="radio" name="basemap" value={b.id} bind:group={basemapId} onchange={() => (layersOpen = false)} /> {b.label}</label>
				{/each}
			</fieldset>
		{/if}
	</div>
	{#if picking}<p class="hint" role="status">Toca el punt des d'on vols veure el paisatge.</p>
	{:else if terrain && !compact}<p class="hint">Relleu 3D: arrossegueu amb el botó dret (o dos dits) per inclinar i girar.</p>{/if}
	{#if count === 0}<p class="map-note">Cap agulla geolocalitzada encara.</p>{/if}
	{#if tileErrors > 4}<p class="map-note" role="status">{net.online ? `No s'han pogut carregar les rajoles del mapa de fons${basemapId !== 'otm' ? '; proveu un altre mapa de fons' : ''}.` : 'Sense connexió: el mapa de fons només es veu a la zona desada (vegeu «Ús sense connexió»).'}</p>{/if}
</div>

<style>
	.map-wrap { position: relative; width: 100%; height: 100%; min-height: 240px; background: #ece6dc; }
	.map { position: absolute; inset: 0; }
	.map-tools { position: absolute; z-index: 2; display: flex; flex-direction: column; gap: .4rem; align-items: flex-end;
		top: 10px; right: 10px; margin-top: 178px; }
	.compact .map-tools { margin-top: 128px; }
	.tool { min-height: 0; width: 2.4rem; height: 2.4rem; padding: 0; border-radius: .6rem; background: #fff; color: #222; border: 0; box-shadow: 0 0 0 2px rgb(0 0 0 / .1); font-size: .7rem; font-weight: 700; flex-direction: column; gap: 0; line-height: 1; }
	.tool:hover { background: #f2f2f2; }
	.tool.on { background: #1f1b16; color: #fff; }
	.basemaps { margin: 0; padding: .5rem .75rem .6rem; background: #fff; color: #222; border: 0; border-radius: .6rem; box-shadow: var(--shadow-2); display: grid; gap: .25rem; font-size: .9rem; min-width: 12rem; }
	.basemaps legend { float: left; font-weight: 700; font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; color: #666; padding: .1rem 0 .25rem; }
	.basemaps label { display: flex; gap: .5rem; align-items: center; padding: .2rem 0; cursor: pointer; }
	.hint, .map-note { position: absolute; z-index: 2; left: 50%; transform: translateX(-50%); top: 10px; margin: 0; padding: .35rem .8rem; border-radius: 999px; background: rgb(20 15 10 / .78); color: #fff; font-size: .8rem; max-width: calc(100% - 7rem); text-align: center; pointer-events: none; }
	.map-note { top: auto; bottom: 36px; }
	:global(.needle-tip .maplibregl-popup-content) { padding: .3rem .6rem; border-radius: .5rem; font: 600 .85rem var(--font-ui); color: #1f1b16; box-shadow: var(--shadow-2); }
	:global(.maplibregl-ctrl-group) { border-radius: .6rem !important; }
	:global(.maplibregl-ctrl-group button) { width: 2.4rem !important; height: 2.4rem !important; min-height: 0; border-radius: 0; }
</style>
