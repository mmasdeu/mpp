<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import Map from '$lib/components/Map/Map.svelte';
	import { dataset, getSection } from '$lib/data/loader';
	import { searchNeedles } from '$lib/search/search';

	let region = $state('');
	let section = $state('');
	let q = $state('');
	let geo = $state<'all' | 'yes' | 'no'>('all');
	let selected = $state<string | null>(null);
	let loaded = $state(false);

	onMount(() => {
		const p = new URLSearchParams(location.search);
		selected = p.get('needle');
		const n = selected ? dataset.needles.find((x) => x.id === selected) : null;
		section = n?.sectionId ?? p.get('section') ?? '';
		region = n?.regionId ?? p.get('region') ?? (section ? getSection(section)?.regionId ?? '' : '');
		q = p.get('q') ?? '';
		geo = (p.get('geo') as typeof geo) ?? 'all';
		loaded = true;
	});
	$effect(() => {
		if (!loaded) return;
		const p = new URLSearchParams();
		if (selected) p.set('needle', selected);
		if (region) p.set('region', region);
		if (section) p.set('section', section);
		if (q) p.set('q', q);
		if (geo !== 'all') p.set('geo', geo);
		history.replaceState(history.state, '', `${location.pathname}${p.size ? '?' + p : ''}`);
	});

	const sections = $derived(dataset.sections.filter((s) => !region || s.regionId === region));
	const filtered = $derived.by(() => {
		let ns = q ? searchNeedles(dataset.needles, q) : dataset.needles;
		return ns.filter((n) => (!region || n.regionId === region) && (!section || n.sectionId === section) && (geo === 'all' || (geo === 'yes') === !!n.location));
	});
	const active = $derived(!!(region || section || q || geo !== 'all'));
	const visibleIds = $derived(active ? filtered.map((n) => n.id) : null);
	const reset = () => { region = ''; section = ''; q = ''; geo = 'all'; selected = null; };
	$effect(() => { if (section && !sections.some((s) => s.id === section)) section = ''; });
</script>

<svelte:head><title>Mapa · Montserrat Pam a Pam</title></svelte:head>
<h1>Mapa</h1>
<form class="filters" onsubmit={(e) => e.preventDefault()} aria-label="Filtres del mapa">
	<label>Regió<select bind:value={region}><option value="">Totes</option>{#each dataset.regions as r}<option value={r.id}>{r.name}</option>{/each}</select></label>
	<label>Secció<select bind:value={section}><option value="">Totes</option>{#each sections as s}<option value={s.id}>{s.order}. {s.name}</option>{/each}</select></label>
	<label>Cerca<input type="search" bind:value={q} placeholder="Nom de l'agulla" /></label>
	<label>Geolocalització<select bind:value={geo}><option value="all">Totes</option><option value="yes">Geolocalitzades</option><option value="no">Sense coordenades</option></select></label>
	<button type="button" onclick={reset} disabled={!active && !selected}>Esborra els filtres</button>
</form>
{#if active}
	<div class="chips" aria-label="Filtres actius">
		{#if region}<span class="badge">Regió: {dataset.regions.find((r) => r.id === region)?.name}</span>{/if}
		{#if section}<span class="badge">Secció: {getSection(section)?.name}</span>{/if}
		{#if q}<span class="badge">Cerca: {q}</span>{/if}
		{#if geo !== 'all'}<span class="badge">{geo === 'yes' ? 'Geolocalitzades' : 'Sense coordenades'}</span>{/if}
	</div>
{/if}
<Map geojsonUrl="{base}/generated/needles.geojson" {visibleIds} {selected} />

<h2>Llista ({filtered.length} agulles)</h2>
<p class="muted">Alternativa en text al mapa: inclou les agulles que encara no tenen coordenades.</p>
<ul class="plain">
	{#each filtered.slice(0, 200) as n (n.id)}
		<li><a href="{base}/needles/{n.id}/">{n.name}</a> <span class="muted">· {getSection(n.sectionId)?.name}{n.location ? '' : ' · sense coordenades'}</span></li>
	{/each}
</ul>
{#if filtered.length > 200}<p class="muted">Es mostren les 200 primeres; afineu els filtres.</p>{/if}
