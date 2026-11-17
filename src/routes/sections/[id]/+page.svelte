<script lang="ts">
	import { base } from '$app/paths';
	import { needlesOf } from '$lib/data/loader';
	let { data } = $props();
	const ns = $derived(needlesOf(data.section));
	const count = $derived(ns.length);
</script>

<svelte:head><title>{data.section.name} · Montserrat Pam a Pam</title></svelte:head>
<p><a href="{base}/regions/{data.region.slug}/">← {data.region.name}</a></p>
<h1>Secció {data.section.order}: {data.section.name}</h1>
{#if data.section.bookReference}
	<p><small>p. {data.section.bookReference.pageStart}–{data.section.bookReference.pageEnd}</small></p>
{/if}
<p>{count} agulles</p>
<p><a href="{base}/map/?section={data.section.id}">Veure al mapa</a></p>
{#if ns.length}
	<ul class="plain">
		{#each ns as n (n.id)}
			<li><a href="{base}/needles/{n.id}/">{n.name}</a> {#if n.metadata.extractionStatus === 'unreviewed'}<span class="badge">sense revisar</span>{/if}</li>
		{/each}
	</ul>
{:else}
	<p>Cap agulla en aquesta secció.</p>
{/if}
<nav aria-label="Seccions">
	{#if data.prev}<a href="{base}/sections/{data.prev.id}/">← Secció {data.prev.order}: {data.prev.name}</a>{/if}
	{#if data.next}<a href="{base}/sections/{data.next.id}/" style="float:right">Secció {data.next.order}: {data.next.name} →</a>{/if}
</nav>
