<script lang="ts">
	import { base } from '$app/paths';
	import Panorama from '$lib/components/Panorama/Panorama.svelte';
	import { observations } from '$lib/data/loader';
	let { data } = $props();
	const p = $derived(data.panorama);
	const obs = $derived(observations.find((o) => o.id === p.observationPointId));
</script>

<svelte:head><title>{p.title} · Montserrat Pam a Pam</title></svelte:head>
<p><a href="{base}/panoramas/">← Panorames</a></p>
<h1>{p.title}</h1>
{#if p.status === 'unreviewed'}<p><span class="badge">Anotacions sense revisar</span></p>{/if}
<Panorama panorama={p} />
<dl>
	{#if obs}<dt>Punt d'observació</dt><dd>{obs.name} ({obs.location.latitude.toFixed(5)}, {obs.location.longitude.toFixed(5)}{obs.location.elevation ? `, ${obs.location.elevation} m` : ''}; {obs.location.accuracy === 'verified' ? 'verificat' : 'aproximat'})</dd>{/if}
	{#if p.viewingDirection !== undefined}<dt>Direcció de la vista</dt><dd>{p.viewingDirection}°</dd>{/if}
	<dt>Autoria</dt><dd>{p.author ?? 'No documentada'}</dd>
	<dt>Font</dt><dd>{p.source ?? 'No documentada'}</dd>
	<dt>Llicència</dt><dd>{p.license ?? 'No documentada'}</dd>
	{#if p.date}<dt>Data</dt><dd>{p.date}</dd>{/if}
</dl>
