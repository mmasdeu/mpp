<script lang="ts">
	import { base } from '$app/paths';
	import { dataset, getSection, needleCount } from '$lib/data/loader';
</script>

<svelte:head><title>Regions · Montserrat Pam a Pam</title></svelte:head>
<h1>Les sis regions de Montserrat</h1>
<p>Atles interactiu basat en el llibre de Josep Barberà. {dataset.regions.length} regions, {dataset.sections.length} seccions.</p>
{#each dataset.regions as r (r.id)}
	<section>
		<h2><a href="{base}/regions/{r.slug}/">{r.name}</a></h2>
		<p>{r.sectionIds.length} seccions · {needleCount(r)} agulles inventariades{r.bookReference?.pageStart ? ` · p. ${r.bookReference.pageStart}` : ''}</p>
		<p>{r.sectionIds.map((id) => getSection(id)?.name).join(', ')}</p>
	</section>
{/each}
