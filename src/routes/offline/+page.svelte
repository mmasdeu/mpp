<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { version } from '$app/environment';
	import { dataset } from '$lib/data/loader';
	import { net, downloadAll, clearOfflineContent, downloadPack, packStored, clearTiles } from '$lib/pwa/offline.svelte';
	import { PACKS, tileUrls, type Pack } from '$lib/pwa/tiles';
	import { needlePagePaths } from '$lib/pwa/policy';

	let supported = $state(true);
	let controlled = $state(false);
	let progress = $state<{ done: number; total: number } | null>(null);
	let message = $state('');
	let usage = $state<string | null>(null);
	let installEvent = $state<any>(null);
	let installed = $state(false);

	// offline map packs
	const totals = Object.fromEntries(PACKS.map((p) => [p.id, tileUrls(p).length]));
	let stored = $state<Record<string, number>>({});
	let packProgress = $state<Record<string, number | null>>({});
	let mapMessage = $state('');
	const mb = (n: number) => (n < 10 ? n.toFixed(1) : Math.round(n)).toString();
	async function refreshPacks() { for (const p of PACKS) stored[p.id] = await packStored(p); }
	async function getPack(p: Pack) {
		mapMessage = '';
		packProgress[p.id] = 0;
		try {
			await navigator.storage?.persist?.();
			const bytes = await downloadPack(p, (d, t) => (packProgress[p.id] = d / t));
			mapMessage = `${p.label}: desat (${mb(bytes / 1048576)} MB descarregats).`;
		} catch {
			mapMessage = `${p.label}: la descàrrega s'ha interromput. Les rajoles ja desades es conserven; torneu-ho a provar.`;
		}
		packProgress[p.id] = null;
		await refreshPacks(); refreshUsage();
	}
	async function clearMap() { await clearTiles(); mapMessage = 'Mapa desat esborrat.'; await refreshPacks(); refreshUsage(); }

	async function refreshUsage() {
		const e = await navigator.storage?.estimate?.();
		usage = e?.usage != null ? `${(e.usage / 1048576).toFixed(1)} MB` : null;
	}
	onMount(() => {
		supported = 'serviceWorker' in navigator && 'caches' in window;
		controlled = !!navigator.serviceWorker?.controller;
		navigator.serviceWorker?.addEventListener('controllerchange', () => (controlled = true));
		addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; });
		addEventListener('appinstalled', () => (installed = true));
		refreshUsage();
		if (supported) refreshPacks();
	});

	async function download() {
		message = '';
		progress = { done: 0, total: dataset.needles.length };
		try {
			await downloadAll(version, needlePagePaths(dataset.needles.map((n) => n.id), base), (done, total) => (progress = { done, total }));
			message = 'Totes les fitxes estan desades per a ús sense connexió.';
		} catch {
			message = 'La descàrrega s\'ha interromput (potser s\'ha perdut la connexió). Les fitxes ja descarregades es conserven; torneu-ho a provar.';
		}
		refreshUsage();
	}
	async function clear() { await clearOfflineContent(); message = 'Contingut desat esborrat.'; progress = null; refreshUsage(); }
	async function install() { await installEvent.prompt(); installEvent = null; }
</script>

<svelte:head><title>Ús sense connexió · Montserrat Pam a Pam</title></svelte:head>
<h1>Ús sense connexió</h1>
<p>Estat: <strong>{net.online ? 'amb connexió' : 'sense connexió'}</strong>.
	{#if !supported}Aquest navegador no admet l'ús sense connexió.{:else if controlled}L'aplicació ja es pot obrir sense connexió.{:else}L'aplicació s'està preparant per a l'ús sense connexió; recarregueu la pàgina d'aquí a un moment.{/if}</p>

<h2>Què funciona sense connexió</h2>
<ul>
	<li>Regions, seccions, cerca i fitxes que ja heu visitat (o que descarregueu a sota).</li>
	<li>Les fotografies i panorames que ja heu vist (fins a 150 imatges, incloses les pàgines del llibre).</li>
	<li>Les fitxes no visitades també s'obren, perquè el contingut viatja amb l'aplicació.</li>
</ul>
<p>El mapa de fons i el relleu 3D de la zona de Montserrat es poden desar a sota. Mentre navegueu amb connexió, les rajoles de l'ICGC que veieu dins
	d'aquesta zona també es desen soles. Fora de la zona, i amb OpenTopoMap (les seves condicions no permeten descàrregues massives), cal connexió.</p>

<h2>Mapa sense connexió</h2>
<p class="muted">Zona: el massís de Montserrat amb un marge d'1,5 km. Dades © Institut Cartogràfic i Geològic de Catalunya (CC BY 4.0).</p>
<ul class="packs">
	{#each PACKS as p (p.id)}
		{@const total = totals[p.id]}
		{@const have = stored[p.id] ?? 0}
		<li class="card">
			<div class="pk">
				<strong>{p.label}</strong>{#if p.note} <span class="badge neutral">{p.note}</span>{/if}
				<span class="muted">{total} rajoles · ≈ {mb((total * p.avgKB) / 1024)} MB · zoom {p.zmin}{p.zmax > p.zmin ? `–${p.zmax}` : ''}</span>
				{#if packProgress[p.id] != null}
					<progress max="1" value={packProgress[p.id]} aria-label="Progrés: {p.label}"></progress>
				{:else}
					<span class="muted" data-testid="pack-{p.id}">{have >= total ? 'Desat' : have ? `${have} de ${total} desades` : 'No desat'}</span>
				{/if}
			</div>
			<button type="button" onclick={() => getPack(p)} disabled={!supported || !net.online || packProgress[p.id] != null || have >= total}>
				{have >= total ? 'Desat' : have ? 'Completa' : 'Descarrega'}<span class="sr-only"> {p.label}</span>
			</button>
		</li>
	{/each}
</ul>
<p><button type="button" onclick={clearMap} disabled={!supported}>Esborra el mapa desat</button></p>
<p role="status">{mapMessage}</p>

<h2>Fitxes</h2>
<p>Descarrega les {dataset.needles.length} fitxes per tenir-les disponibles a la muntanya.</p>
<p>
	<button type="button" onclick={download} disabled={!supported || !net.online || (progress !== null && progress.done < progress.total)}>Descarrega totes les fitxes</button>
	<button type="button" onclick={clear} disabled={!supported}>Esborra el contingut desat</button>
</p>
{#if progress}<p><progress max={progress.total} value={progress.done} aria-label="Progrés de la descàrrega"></progress> {progress.done} / {progress.total}</p>{/if}
<p role="status">{message}</p>
{#if usage}<p class="muted">Espai utilitzat pel navegador: {usage}.</p>{/if}

{#if installEvent && !installed}<p><button type="button" onclick={install}>Instal·la l'aplicació</button></p>{/if}
{#if installed}<p>Aplicació instal·lada.</p>{/if}

<style>
	.packs { list-style: none; padding: 0; margin: 1rem 0; display: grid; gap: .6rem; max-width: 46rem; }
	.packs li { display: flex; align-items: center; gap: 1rem; padding: .8rem 1rem; }
	.pk { flex: 1; display: grid; gap: .15rem; }
	.pk progress { width: 100%; }
	.pk .badge { justify-self: start; }
</style>
