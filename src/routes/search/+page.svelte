<script lang="ts">
	import { base } from '$app/paths';
	import { KIND_LABEL } from '$lib/data/kinds';
	import { page } from '$app/state';
	import { dataset, getSection } from '$lib/data/loader';
	import { searchNeedles } from '$lib/search/search';
	import { regionColor } from '$lib/ui/regions';
	import Icon from '$lib/ui/Icon.svelte';

	// The URL is only read in the browser; prerendered HTML starts with an empty box.
	let query = $state(typeof window !== 'undefined' ? (page.url.searchParams.get('q') ?? '') : '');
	const results = $derived(searchNeedles(dataset.needles, query));
	$effect(() => {
		const u = new URL(location.href);
		query ? u.searchParams.set('q', query) : u.searchParams.delete('q');
		history.replaceState(history.state, '', u);
	});
</script>

<svelte:head><title>Cerca · Montserrat Pam a Pam</title></svelte:head>
<header class="page-head">
	<h1>Cerca</h1>
	<div class="searchbox">
		<Icon name="search" size={20} />
		<label class="sr-only" for="cerca">Nom, variant o número de Semir</label>
		<!-- svelte-ignore a11y_autofocus -->
		<input id="cerca" type="search" bind:value={query} autocomplete="off" placeholder="Nom, variant o número de Semir" autofocus />
	</div>
</header>
<p aria-live="polite" class="muted">{query ? `${results.length} resultats` : `Escriviu per cercar entre ${dataset.needles.length} agulles (sense accents ni majúscules).`}</p>
{#if results.length}
	<ul class="needle-list">
		{#each results as n (n.id)}
			<li><a href="{base}/needles/{n.id}/">
				<span class="dot" style="--c:{regionColor(n.regionId)}"></span>
				<span class="nm">{n.name}<small>{n.kind ? `${KIND_LABEL[n.kind]} · ` : ''}{getSection(n.sectionId)?.name ?? ''}{n.alternativeNames.length ? ` · ${n.alternativeNames.join(', ')}` : ''}</small></span>
				{#if !n.location}<Icon name="pin-off" size={16} label="sense coordenades" />{/if}
			</a></li>
		{/each}
	</ul>
{/if}

<style>
	.searchbox { position: relative; display: flex; align-items: center; color: var(--muted); max-width: 40rem; }
	.searchbox :global(svg) { position: absolute; left: 1rem; pointer-events: none; }
	.searchbox input { width: 100%; min-height: 3.25rem; padding-left: 2.85rem; font-size: 1.1rem; box-shadow: var(--shadow-1); }
	.needle-list :global(svg) { color: var(--muted); flex: none; }
</style>
