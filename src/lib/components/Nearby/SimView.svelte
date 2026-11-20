<script lang="ts">
	/**
	 * Simulated view from any point: the 3D map (ICGC 5 m relief, real scale) with the camera at eye height, looking around, and the
	 * needles in sight labelled (those hidden behind the terrain are worked out with a line-of-sight test on the elevation model).
	 */
	import { onMount, untrack } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { base } from '$app/paths';
	import { dataset } from '$lib/data/loader';
	import { regionColor } from '$lib/ui/regions';
	import { BASEMAPS, DEMS, GLYPHS, type BasemapId } from '$lib/components/Map/config';
	import { angleDiff, bearing as bearingTo, cardinal, declutter, distance, formatDistance, lineOfSight } from '$lib/geo/nearby';
	import { elevationAt, elevationFast, prefetch } from '$lib/geo/dem';

	let { latitude, longitude, initialBearing = null }: { latitude: number; longitude: number; initialBearing?: number | null } = $props();

	const MAX_DIST = 8000, MAX_LABELS = 18;
	// MapLibre's camera cannot look exactly at (or above) the horizon with terrain on: 89° is ~1° below it, enough at eye level
	const PMAX = 89;
	let el: HTMLDivElement;
	let map: import('maplibre-gl').Map | undefined;
	let w = $state(400), h = $state(700);
	let heading = $state(0), pitch = $state(88), fov = $state(45), eye = $state(2);
	let basemapId = $state<BasemapId>('orto');
	let ground = $state<number | null>(null);
	let status = $state('Carregant el relleu…');
	let showHidden = $state(false);
	let frame = $state(0);
	// visibility per needle: true / false / undefined (not computed yet)
	let visible = $state<Record<string, boolean>>({});

	const here = $derived({ latitude, longitude });
	const candidates = $derived(dataset.needles.filter((n) => n.location && distance(here, n.location) <= MAX_DIST && distance(here, n.location) > 15)
		.map((n) => ({ n, d: distance(here, n.location!), b: bearingTo(here, n.location!) })).sort((a, b) => a.d - b.d));

	let loaded = $state(false);
	function apply() {
		if (!map || !loaded) return;
		const alt = (ground ?? 0) + eye;
		try { map.jumpTo(map.calculateCameraOptionsFromCameraLngLatAltRotation([longitude, latitude], alt, heading, pitch, 0)); } catch { /* transient while the terrain loads */ }
	}
	$effect(() => { heading; pitch; eye; ground; loaded; apply(); });
	$effect(() => { if (map && loaded) map.setVerticalFieldOfView(fov); });
	$effect(() => {
		const b = BASEMAPS.find((x) => x.id === basemapId)!;
		if (!map || !map.getSource('base')) return;
		(map.getSource('base') as any).setTiles(b.tiles);
	});

	// line of sight for each needle in range (nearest first), once the viewer's ground height is known
	async function computeVisibility(g: number) {
		await prefetch(latitude, longitude, MAX_DIST);
		const viewer = g + eye, acc: Record<string, boolean> = {};
		let i = 0;
		for (const { n, d } of candidates) {
			const l = n.location!;
			const target = l.elevation ?? (await elevationAt(l.latitude, l.longitude));
			// at most ~80 samples per line (every 30–100 m)
			acc[n.id] = target === null ? true : await lineOfSight(here, viewer, l, target + 2, elevationFast, { step: Math.max(30, Math.min(100, d / 80)) });
			if (++i % 25 === 0) visible = { ...visible, ...acc };   // show progress without re-rendering for every needle
		}
		visible = { ...visible, ...acc };
		status = '';
	}

	onMount(() => {
		let disposed = false;
		(async () => {
			const ml = await import('maplibre-gl');
			if (disposed) return;
			const b = BASEMAPS.find((x) => x.id === basemapId)!, d = DEMS[0];
			map = new ml.Map({
				container: el, center: [longitude, latitude], zoom: 15, maxPitch: 89, centerClampedToGround: false, maxZoom: 22, attributionControl: false, interactive: false,
				style: { version: 8, glyphs: GLYPHS,
					sources: { base: { type: 'raster', tileSize: 256, tiles: b.tiles, maxzoom: b.maxzoom, attribution: b.attribution },
						dem: { type: 'raster-dem', tiles: d.tiles, tileSize: d.tileSize, encoding: d.encoding, minzoom: d.minzoom, maxzoom: d.maxzoom, attribution: d.attribution } },
					layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#d9d2c4' } }, { id: 'base', type: 'raster', source: 'base' }],
					sky: { 'sky-color': '#7fb0dd', 'horizon-color': '#e6edf2', 'fog-color': '#e8e4dc', 'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.6, 'atmosphere-blend': 0.7 } }
			});
			map.addControl(new ml.AttributionControl({ compact: true }), 'bottom-right');
			(window as any).__simmap = map;
			map.once('style.load', () => { loaded = true; });
			// map events can fire inside our effects (jumpTo): untrack so the effect does not come to depend on `frame`
			const bump = () => untrack(() => frame++);
			map.on('move', bump);
			map.on('render', bump);
			// ground under the viewer: the elevation model; facing the bulk of the needles around (or the given bearing)
			const g = await elevationAt(latitude, longitude);
			if (disposed) return;
			ground = g;
			// the relief is switched on only when the elevation model answers (MapLibre's terrain fails while its tiles cannot load)
			if (g !== null && map) map.setTerrain({ source: 'dem', exaggeration: 1 });
			if (initialBearing !== null) heading = initialBearing;
			else {
				const near = candidates.slice(0, 40);
				if (near.length) { let x = 0, y = 0; for (const c of near) { x += Math.sin((c.b * Math.PI) / 180) / Math.max(c.d, 200); y += Math.cos((c.b * Math.PI) / 180) / Math.max(c.d, 200); }
					heading = ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360; }
			}
			apply();
			if (g === null) { status = 'Sense model del terreny (cal connexió o el paquet «Relleu 3D»): la vista i les etiquetes són aproximades.'; visible = Object.fromEntries(candidates.map((c) => [c.n.id, true])); }
			else { status = 'Calculant quines agulles es veuen…'; computeVisibility(g); }
		})();
		return () => { disposed = true; map?.remove(); };
	});

	// drag to look around (horizontal: turn, vertical: look up/down); wheel or buttons to zoom
	let drag: { x: number; y: number; h: number; p: number } | null = null;
	function down(e: PointerEvent) { drag = { x: e.clientX, y: e.clientY, h: heading, p: pitch }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
	function move(e: PointerEvent) {
		if (!drag) return;
		const hf = (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * (w / h)) * 180) / Math.PI;
		heading = (drag.h - ((e.clientX - drag.x) / w) * hf + 360) % 360;
		pitch = Math.max(55, Math.min(PMAX, drag.p + ((e.clientY - drag.y) / h) * fov));
	}
	const up = () => (drag = null);
	const wheel = (e: WheelEvent) => { e.preventDefault(); fov = Math.max(8, Math.min(70, fov * (e.deltaY > 0 ? 1.1 : 0.9))); };
	function key(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft') heading = (heading - 5 + 360) % 360;
		else if (e.key === 'ArrowRight') heading = (heading + 5) % 360;
		else if (e.key === 'ArrowUp') pitch = Math.min(PMAX, pitch + 3);
		else if (e.key === 'ArrowDown') pitch = Math.max(55, pitch - 3);
		else if (e.key === '+') fov = Math.max(8, fov * 0.85);
		else if (e.key === '-') fov = Math.min(70, fov / 0.85);
		else return;
		e.preventDefault();
	}

	const placed = $derived.by(() => {
		frame;
		if (!map) return { labels: [], dots: [] };
		const hf = (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * (w / h)) * 180) / Math.PI;
		const inView = candidates
			.filter((c) => (showHidden || visible[c.n.id] !== false) && Math.abs(angleDiff(c.b, heading)) < hf / 2 + 2)
			.map((c) => { const p = map!.project([c.n.location!.longitude, c.n.location!.latitude]); return { ...c, x: p.x, y: p.y, hidden: visible[c.n.id] === false }; })
			.filter((c) => Number.isFinite(c.x) && c.x > -20 && c.x < w + 20 && c.y > 0 && c.y < h + 20);
		const named = inView.filter((c) => !c.hidden).slice(0, MAX_LABELS);
		const ys = declutter(named.map((c) => ({ x: c.x, y: c.y - 8 - 17, w: Math.min(220, 24 + c.n.name.length * 7), h: 34 })));
		const labels = named.map((c, i) => ({ ...c, ly: ys[i] + 17 })).filter((c) => c.ly > 70);
		const shown = new Set(labels.map((c) => c.n.id));
		return { labels, dots: inView.filter((c) => !shown.has(c.n.id)) };
	});
	const hidden = $derived(Object.values(visible).filter((v) => v === false).length);
</script>

<div class="sim" bind:clientWidth={w} bind:clientHeight={h}>
	<div class="map" bind:this={el} role="img" aria-label="Vista simulada des de {latitude.toFixed(5)}, {longitude.toFixed(5)}, mirant cap a {Math.round(heading)}° {cardinal(heading)}"></div>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div class="pad" role="application" aria-label="Arrossega per mirar al voltant; fletxes del teclat per girar" tabindex="0"
		onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onwheel={wheel} onkeydown={key}></div>

	{#each placed.dots as c (c.n.id)}
		<a class="dot" class:hid={c.hidden} href="{base}/needles/{c.n.id}/" style:left="{c.x}px" style:top="{c.y}px" style:--c={regionColor(c.n.regionId)} aria-label="{c.n.name}, {formatDistance(c.d)}{c.hidden ? ' (amagada)' : ''}"></a>
	{/each}
	{#each placed.labels as c (c.n.id)}
		<svg class="stem" aria-hidden="true" style:left="{c.x - 1}px" style:top="{c.ly}px" width="2" height={Math.max(2, c.y - c.ly)}><line x1="1" y1="0" x2="1" y2="100%" /></svg>
		<a class="label" data-testid="sim-label" href="{base}/needles/{c.n.id}/" style:left="{c.x}px" style:top="{c.ly}px" style:--c={regionColor(c.n.regionId)}>
			<strong>{c.n.name}</strong><small>{formatDistance(c.d)}</small>
		</a>
	{/each}

	<div class="top">
		<a class="round" href="{base}/map/" aria-label="Torna al mapa">✕</a>
		<div class="compass" data-testid="sim-compass">{Math.round(heading)}° {cardinal(heading)}</div>
		<div class="turn">
			<button type="button" class="round" onclick={() => (heading = (heading - 30 + 360) % 360)} aria-label="Gira a l'esquerra">⟲</button>
			<button type="button" class="round" onclick={() => (heading = (heading + 30) % 360)} aria-label="Gira a la dreta">⟳</button>
		</div>
	</div>
	<div class="bottom">
		{#if status}<p class="status" role="status">{status}</p>{/if}
		<div class="controls">
			<button type="button" class="round" onclick={() => (fov = Math.max(8, fov * 0.75))} aria-label="Apropa (zoom)">+</button>
			<button type="button" class="round" onclick={() => (fov = Math.min(70, fov / 0.75))} aria-label="Allunya (zoom)">−</button>
			<label class="chip-sel">Alçada <select bind:value={eye} aria-label="Alçada dels ulls sobre el terreny"><option value={2}>2 m</option><option value={10}>10 m</option><option value={30}>30 m</option><option value={100}>100 m</option></select></label>
			<label class="chip-sel">Fons <select bind:value={basemapId} aria-label="Mapa de fons"><option value="orto">Ortofoto</option><option value="topo">Topogràfic</option></select></label>
			{#if hidden}<label class="chip-sel"><input type="checkbox" bind:checked={showHidden} /> Amagades ({hidden})</label>{/if}
		</div>
		<p class="info">{ground !== null ? `${Math.round(ground)} m · ` : ''}{placed.labels.length} agulles a la vista · Simulació a partir del relleu ICGC 5 m; les agulles petites no hi surten modelades.</p>
	</div>
</div>

<style>
	.sim { position: fixed; inset: 0; z-index: 50; background: #cfd8de; overflow: hidden; color: #fff; }
	.map, .pad { position: absolute; inset: 0; }
	.pad { touch-action: none; cursor: grab; outline: none; }
	.pad:active { cursor: grabbing; }
	.stem { position: absolute; overflow: visible; pointer-events: none; }
	.stem line { stroke: #fff; stroke-width: 1.5; filter: drop-shadow(0 0 1px #000); }
	.label { position: absolute; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; padding: .2rem .5rem; background: rgb(10 10 10 / .72);
		border-left: 4px solid var(--c); border-radius: .4rem; color: #fff; text-decoration: none; line-height: 1.15; white-space: nowrap; font-size: .85rem; box-shadow: 0 2px 8px rgb(0 0 0 / .35); }
	.label strong { max-width: 12rem; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-ui); }
	.label small { opacity: .85; font-size: .75em; }
	.dot { position: absolute; width: .65rem; height: .65rem; margin: -.33rem 0 0 -.33rem; border-radius: 50%; background: var(--c); border: 2px solid #fff; box-shadow: 0 0 3px #000; }
	.dot.hid { opacity: .45; border-style: dashed; }
	.top { position: absolute; top: calc(env(safe-area-inset-top) + .6rem); left: .6rem; right: .6rem; display: flex; justify-content: space-between; align-items: center; gap: .5rem; pointer-events: none; }
	.top > * { pointer-events: auto; }
	.turn { display: flex; gap: .4rem; }
	.round { width: 2.75rem; height: 2.75rem; min-height: 0; padding: 0; border-radius: 50%; display: grid; place-items: center; background: rgb(0 0 0 / .55); color: #fff;
		border: 1px solid rgb(255 255 255 / .3); font-size: 1.2rem; text-decoration: none; }
	.compass { background: rgb(0 0 0 / .55); padding: .35rem .9rem; border-radius: 999px; font-variant-numeric: tabular-nums; font-weight: 700; }
	.bottom { position: absolute; left: .6rem; right: .6rem; bottom: calc(env(safe-area-inset-bottom) + 1.8rem); display: grid; gap: .4rem; justify-items: center; pointer-events: none; }
	.bottom > * { pointer-events: auto; }
	.controls { display: flex; flex-wrap: wrap; gap: .4rem; justify-content: center; align-items: center; }
	.chip-sel { display: inline-flex; align-items: center; gap: .3rem; background: rgb(0 0 0 / .55); padding: .3rem .6rem; border-radius: 999px; font-size: .85rem; }
	.chip-sel select { min-height: 0; padding: .1rem .3rem; font-size: .85rem; background: #fff; color: #111; }
	.status, .info { margin: 0; background: rgb(0 0 0 / .55); padding: .25rem .7rem; border-radius: .5rem; font-size: .8rem; text-align: center; }
	.info { opacity: .85; font-size: .72rem; }
</style>
