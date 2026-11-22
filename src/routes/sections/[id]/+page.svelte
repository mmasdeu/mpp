<script lang="ts">
	import { base } from '$app/paths';
	import { needlesOf } from '$lib/data/loader';
	import GroupEditor from '$lib/editor/GroupEditor.svelte';
	import { editor } from '$lib/editor/editor.svelte';
	import IntroText from '$lib/components/Book/IntroText.svelte';
	import Cutouts from '$lib/components/Book/Cutouts.svelte';
	import MiniMap from '$lib/components/Map/MiniMap.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { regionColor } from '$lib/ui/regions';
	let { data } = $props();
	const ns = $derived(needlesOf(data.section));
	const located = $derived(ns.filter((n) => n.location).map((n) => n.id));
</script>

<svelte:head><title>{data.section.name} · Montserrat Pam a Pam</title></svelte:head>
<nav class="crumbs" aria-label="Camí"><a href="{base}/">Inici</a><span aria-hidden="true">›</span><a href="{base}/regions/{data.region.slug}/">{data.region.name}</a></nav>
<header class="page-head">
	<p class="eyebrow"><span class="dot" style="--c:{regionColor(data.region.id)}"></span> {data.region.name}</p>
	<h1>Secció {data.section.order}: {data.section.name}</h1>
	<ul class="stat-row"><li><strong>{ns.length}</strong> agulles</li><li><strong>{located.length}</strong> al mapa</li>{#if data.section.bookReference}<li>p. <strong>{data.section.bookReference.pageStart}–{data.section.bookReference.pageEnd}</strong></li>{/if}</ul>
	<p><a href="{base}/map/?section={data.section.id}">Veure al mapa</a></p>
</header>
{#if __EDITOR__ && editor.on}<GroupEditor kind="section" id={data.section.id} name={data.section.name} intro={data.intro} mapPages={data.mapPages} regionId={data.section.regionId} />{/if}

<div class="two" class:has-plan={data.mapPages.length && __DRAWINGS__}>
	<div>
		{#if located.length}<MiniMap focusIds={located} href="{base}/map/?section={data.section.id}" label="Mapa de la secció {data.section.name}" />{/if}
		<IntroText intro={data.intro} />
	</div>
	{#if data.mapPages.length && __DRAWINGS__}
		<section aria-labelledby="h-secmap"><h2 id="h-secmap">Plànol de la secció</h2><Cutouts pages={data.mapPages} alt="la secció {data.section.name}" label="Plànol" href="{base}/map/?section={data.section.id}" /></section>
	{/if}
</div>

<h2>Agulles</h2>
{#if ns.length}
	<ol class="needle-list">
		{#each ns as n, i (n.id)}
			<li><a href="{base}/needles/{n.id}/">
				<span class="ix">{i + 1}</span>
				<span class="nm"><span class="n">{n.name}</span>{#if n.alternativeNames.length}<small>{n.alternativeNames.join(', ')}</small>{/if}</span>
				{#if n.metadata.extractionStatus === 'unreviewed'}<span class="badge">sense revisar</span>{:else}<span class="badge ok">revisada</span>{/if}
				{#if !n.location}<Icon name="pin-off" size={16} label="sense coordenades" />{/if}
			</a></li>
		{/each}
	</ol>
{:else}
	<p>Cap agulla en aquesta secció.</p>
{/if}
<nav class="pn" aria-label="Seccions">
	{#if data.prev}<a class="prev" href="{base}/sections/{data.prev.id}/"><small>← Secció {data.prev.order}</small>{data.prev.name}</a>{/if}
	{#if data.next}<a class="next" href="{base}/sections/{data.next.id}/"><small>Secció {data.next.order} →</small>{data.next.name}</a>{/if}
</nav>

<style>
	.two { display: grid; gap: 1.5rem; }
	.two:not(.has-plan) { max-width: 52rem; }
	@media (min-width: 62rem) { .two.has-plan { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); align-items: start; } }
	.two :global(figure) { max-width: none; }
	.needle-list :global(svg) { color: var(--muted); flex: none; }
</style>
