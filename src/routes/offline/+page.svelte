<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { version } from '$app/environment';
	import { dataset } from '$lib/data/loader';
	import { net, downloadAll, clearOfflineContent } from '$lib/pwa/offline.svelte';
	import { needlePagePaths } from '$lib/pwa/policy';

	let supported = $state(true);
	let controlled = $state(false);
	let progress = $state<{ done: number; total: number } | null>(null);
	let message = $state('');
	let usage = $state<string | null>(null);
	let installEvent = $state<any>(null);
	let installed = $state(false);

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
<p><strong>Limitació:</strong> el mapa de fons (les rajoles topogràfiques) no es desa; sense connexió només es veuran els marcadors de les agulles sobre un fons buit.</p>

<h2>Desa-ho tot</h2>
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
