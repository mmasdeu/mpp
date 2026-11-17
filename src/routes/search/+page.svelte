<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { dataset, getSection } from '$lib/data/loader';
	import { searchNeedles } from '$lib/search/search';

	// The URL is only read in the browser; prerendered HTML starts with an empty box.
	let query = $state(typeof window !== 'undefined' ? (page.url.searchParams.get('q') ?? '') : '');
	const results = $derived(searchNeedles(dataset.needles, query));
</script>

<svelte:head><title>Cerca · Montserrat Pam a Pam</title></svelte:head>
<h1>Cerca</h1>
<p>
	<label for="cerca">Nom, variant o número de Semir</label><br />
	<input id="cerca" type="search" bind:value={query} autocomplete="off" />
</p>
<p aria-live="polite">{results.length} resultats</p>
{#if results.length}
	<ul class="plain">
		{#each results as n (n.id)}
			<li>
				<a href="{base}/needles/{n.id}/">{n.name}</a>
				<small style="color:var(--muted)">{getSection(n.sectionId)?.name ?? ''}</small>
			</li>
		{/each}
	</ul>
{/if}
