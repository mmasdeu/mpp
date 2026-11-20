<script lang="ts">
	import { base } from '$app/paths';
	import { dataset, getSection, needlesOf } from '$lib/data/loader';
	import GroupEditor from '$lib/editor/GroupEditor.svelte';
	import { editor } from '$lib/editor/editor.svelte';
	import IntroText from '$lib/components/Book/IntroText.svelte';
	import Cutouts from '$lib/components/Book/Cutouts.svelte';
	import MiniMap from '$lib/components/Map/MiniMap.svelte';
	import { regionColor } from '$lib/ui/regions';
	let { data } = $props();
	const sections = $derived(data.region.sectionIds.map((id) => getSection(id)!));
	const all = $derived(sections.flatMap((s) => needlesOf(s)));
	const located = $derived(all.filter((n) => n.location).map((n) => n.id));
</script>

<svelte:head><title>{data.region.name} · Montserrat Pam a Pam</title></svelte:head>
<nav class="crumbs" aria-label="Camí"><a href="{base}/">Inici</a></nav>
<header class="page-head" style="--c:{regionColor(data.region.id)}">
	<p class="eyebrow"><span class="dot"></span> Regió {dataset.regions.indexOf(data.region) + 1} de {dataset.regions.length}</p>
	<h1>Regió {data.region.name}</h1>
	<ul class="stat-row"><li><strong>{sections.length}</strong> seccions</li><li><strong>{all.length}</strong> agulles</li><li><strong>{located.length}</strong> al mapa</li>{#if data.region.bookReference?.pageStart}<li>p. <strong>{data.region.bookReference.pageStart}</strong></li>{/if}</ul>
</header>
{#if __EDITOR__ && editor.on}<GroupEditor kind="region" id={data.region.id} name={data.region.name} intro={data.intro} mapPages={data.mapPages} />{/if}

<div class="two" class:has-plan={data.mapPages.length && __DRAWINGS__}>
	<div>
		<MiniMap focusIds={located} href="{base}/map/?region={data.region.id}" label="Mapa de la regió {data.region.name}" />
		<IntroText intro={data.intro} />
	</div>
	{#if data.mapPages.length && __DRAWINGS__}
		<section aria-labelledby="h-regmap"><h2 id="h-regmap">Plànol de la regió</h2><Cutouts pages={data.mapPages} alt="la regió {data.region.name}" label="Plànol" /></section>
	{/if}
</div>

{#if data.panoramas.length && __DRAWINGS__}
	<section aria-labelledby="h-pano">
		<h2 id="h-pano">Panoràmiques de la regió</h2>
		{#each data.panoramas as pa (pa.id)}
			<figure class="pano" data-testid="book-panorama">
				<a href="{base}/images/drawings/pano-{pa.id}.webp" target="_blank" rel="noopener" aria-label="Obre «{pa.title}» a mida completa (nova pestanya)">
					<img class="ink" src="{base}/images/drawings/pano-{pa.id}.webp" alt="Panoràmica: {pa.title} (pàgin{pa.pages.length > 1 ? 'es' : 'a'} {pa.pages.join('–')} del llibre)" loading="lazy" decoding="async" />
				</a>
				<figcaption>{pa.title} · pàgin{pa.pages.length > 1 ? 'es' : 'a'} {pa.pages.join('–')} · © Publicacions de l'Abadia de Montserrat, 1977</figcaption>
			</figure>
		{/each}
	</section>
{/if}

<h2>Seccions</h2>
<ul class="card-grid secs">
	{#each sections as s (s.id)}
		{@const ns = needlesOf(s)}
		<li>
			<a class="card sec" href="{base}/sections/{s.id}/">
				<span class="eyebrow">Secció {s.order}{s.bookReference?.pageStart ? ` · p. ${s.bookReference.pageStart}–${s.bookReference.pageEnd}` : ''}</span>
				<h3>{s.name}</h3>
				<p class="muted">{ns.length} agulles{ns.length ? ': ' : ''}{ns.slice(0, 6).map((n) => n.name).join(', ')}{ns.length > 6 ? '…' : ''}</p>
			</a>
		</li>
	{/each}
</ul>

<style>
	.page-head .dot { margin-right: .2rem; }
	.two { display: grid; gap: 1.5rem; }
	.two:not(.has-plan) { max-width: 52rem; }
	@media (min-width: 62rem) { .two.has-plan { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); align-items: start; } }
	.two :global(figure) { max-width: none; }
	.pano { margin: 0 0 1.5rem; }
	.pano img { width: 100%; height: auto; display: block; }
	.pano figcaption { font-size: .8rem; color: var(--muted); margin-top: .25rem; }
	.sec { height: 100%; }
	.sec h3 { margin: .2rem 0 .35rem; font-size: 1.2rem; }
	.sec p { margin: 0; }
</style>
