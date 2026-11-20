<script lang="ts">
	import { base } from '$app/paths';
	import { onDestroy, onMount } from 'svelte';
	import { dataset } from '$lib/data/loader';
	import { regionColor } from '$lib/ui/regions';
	import Icon from '$lib/ui/Icon.svelte';
	import ArView from '$lib/components/Nearby/ArView.svelte';
	import { targetsFrom } from '$lib/components/Nearby/targets';
	import { cardinal, distance, formatDistance } from '$lib/geo/nearby';
	import { elevationAt } from '$lib/geo/dem';
	import { orientation, pose, position, startOrientation, startPosition, stopOrientation, stopPosition } from '$lib/geo/sensors.svelte';

	const EYE = 1.6;          // eye height above the ground (m)
	const GEOID = 50;         // GPS altitudes are ellipsoidal; the geoid is ~50 m above the ellipsoid around Montserrat
	const KEY = 'mpp-nearby-range';

	let range = $state(1000);
	let ar = $state(false);
	let groundUser = $state<number | null>(null);
	let dem = $state<Record<string, number>>({});
	let lastDemAt: { latitude: number; longitude: number } | null = null;
	let frame = $state(0), tick = 0;

	onMount(async () => {
		try { const r = Number(localStorage.getItem(KEY)); if (r >= 250 && r <= 5000) range = r; } catch { /* ignore */ }
		try { if ((await navigator.permissions?.query({ name: 'geolocation' as PermissionName }))?.state === 'granted') startPosition(); } catch { /* ignore */ }
		tick = window.setInterval(() => frame++, 250);   // list arrows: 4 updates/s are enough
	});
	onDestroy(() => { clearInterval(tick); stopPosition(); stopOrientation(); });
	$effect(() => { try { localStorage.setItem(KEY, String(range)); } catch { /* ignore */ } });

	async function start() {
		startPosition();
		await startOrientation();
	}
	async function openAr() {
		if (!orientation.active) await startOrientation();
		ar = true;
	}

	// elevations from the 3D map's model: the user's ground (when moved > 30 m) and needles in range that have no altitude in the data
	$effect(() => {
		const c = position.coords;
		if (!c || (lastDemAt && distance(lastDemAt, c) < 30)) return;
		lastDemAt = { latitude: c.latitude, longitude: c.longitude };
		elevationAt(c.latitude, c.longitude).then((e) => { groundUser = e; });
		const need = dataset.needles.filter((n) => n.location && n.location.elevation == null && dem[n.id] == null && distance(c, n.location) < 5000).slice(0, 150);
		Promise.all(need.map(async (n) => [n.id, await elevationAt(n.location!.latitude, n.location!.longitude)] as const)).then((rs) => {
			const add = Object.fromEntries(rs.filter(([, e]) => e !== null) as [string, number][]);
			if (Object.keys(add).length) dem = { ...dem, ...add };
		});
	});

	const userElevation = $derived(groundUser !== null ? groundUser + EYE : position.coords?.altitude != null ? position.coords.altitude - GEOID : null);
	const targets = $derived(position.coords ? targetsFrom(dataset.needles, position.coords, userElevation, dem) : []);
	const inRange = $derived(targets.filter((t) => t.distance <= range));
	const heading = $derived.by(() => { frame; return pose()?.heading ?? null; });
	const located = dataset.needles.filter((n) => n.location).length;
</script>

<svelte:head><title>A prop meu · Montserrat Pam a Pam</title></svelte:head>
<header class="page-head">
	<p class="eyebrow">Amb el GPS i la brúixola del mòbil</p>
	<h1>A prop meu</h1>
	<p class="lead">Les agulles situades al mapa ({located}) més properes a on ets, amb la distància i la direcció. Amb la càmera, les veuràs etiquetades sobre el paisatge.</p>
</header>

{#if !position.coords}
	<div class="card start">
		<p>Cal permetre l'accés a la <strong>ubicació</strong> i, per a la càmera, a l'<strong>orientació</strong> del mòbil. Les dades no surten del dispositiu.</p>
		<button type="button" class="btn primary" onclick={start} disabled={position.watching && !position.error}><Icon name="locate" /> {position.watching && !position.error ? 'Buscant la posició…' : 'Activa la ubicació'}</button>
		{#if position.error}<p class="err" role="alert">{position.error}</p>{/if}
	</div>
{:else}
	<div class="toolbar">
		<button type="button" class="btn primary" onclick={openAr} data-testid="open-ar">📷 Càmera (realitat augmentada)</button>
		<label class="range">Abast: <strong>{formatDistance(range)}</strong> <input type="range" min="250" max="5000" step="250" bind:value={range} aria-label="Abast" /></label>
	</div>
	<p class="muted">Precisió del GPS: ±{Math.round(position.coords.accuracy)} m{userElevation !== null ? ` · altitud ${Math.round(userElevation)} m${groundUser !== null ? ' (model del terreny)' : ' (GPS)'}` : ''}
		{#if heading !== null} · mires cap a {Math.round(heading)}° {cardinal(heading)}{:else if !orientation.active} · <button type="button" class="linkish" onclick={startOrientation}>activa la brúixola</button>{/if}</p>
	{#if orientation.error}<p class="err">{orientation.error}</p>{/if}
	<p><a href="{base}/vista/?lat={position.coords.latitude.toFixed(6)}&lon={position.coords.longitude.toFixed(6)}{heading !== null ? `&b=${Math.round(heading)}` : ''}">Vista simulada des d'aquí</a> (relleu 3D, útil amb boira o de nit)</p>

	{#if inRange.length}
		<ol class="plain nearby" data-testid="nearby-list">
			{#each inRange.slice(0, 60) as t (t.id)}
				<li style:--c={regionColor(t.regionId)}>
					<span class="arrow" aria-hidden="true" style:transform="rotate({heading !== null ? t.bearing - heading : t.bearing}deg)">↑</span>
					<a href="{base}/needles/{t.id}/" class="nm">{t.name}</a>
					<span class="meta">{formatDistance(t.distance)} · {cardinal(t.bearing)}{t.dh !== null ? ` · ${t.dh > 0 ? '+' : ''}${Math.round(t.dh)} m` : ''}</span>
				</li>
			{/each}
		</ol>
		{#if inRange.length > 60}<p class="muted">… i {inRange.length - 60} més. Redueix l'abast per veure les més properes.</p>{/if}
	{:else}
		<p>No hi ha cap agulla situada a menys de {formatDistance(range)}.{targets.length ? ` La més propera és ${targets[0].name}, a ${formatDistance(targets[0].distance)}.` : ''}</p>
	{/if}
	<p class="muted small">{heading !== null ? 'La fletxa indica la direcció respecte a on mira el mòbil.' : 'La fletxa indica la direcció respecte al nord.'} Les agulles sense coordenades no hi surten.</p>
{/if}

{#if ar}<ArView targets={targets} bind:range onclose={() => (ar = false)} />{/if}

<style>
	.start { padding: 1rem 1.1rem; max-width: 36rem; }
	.err { color: var(--danger); }
	.toolbar { display: flex; flex-wrap: wrap; gap: .75rem 1.25rem; align-items: center; margin-bottom: .5rem; }
	.range { display: flex; align-items: center; gap: .5rem; }
	.range input { width: 10rem; }
	.linkish { min-height: 0; padding: 0; border: 0; background: none; color: var(--accent); text-decoration: underline; font-size: inherit; }
	.nearby li { display: grid; grid-template-columns: 2rem 1fr; grid-template-rows: auto auto; column-gap: .5rem; padding: .55rem 0; border-bottom: 1px solid var(--line); }
	.arrow { grid-row: span 2; align-self: center; justify-self: center; font-size: 1.4rem; font-weight: 700; color: var(--c); transition: transform .2s linear; }
	.nm { font-weight: 600; }
	.meta { font-size: .85rem; color: var(--muted); }
	.small { font-size: .82rem; }
</style>
