<script lang="ts">
	import { base } from '$app/paths';
	import { dataset, getSection } from '$lib/data/loader';
	let { data } = $props();
	const n = $derived(data.needle);
	const section = $derived(getSection(n.sectionId)!);
	const region = $derived(dataset.regions.find((r) => r.id === n.regionId)!);
</script>

<svelte:head><title>{n.name} · Montserrat Pam a Pam</title></svelte:head>
<p><a href="{base}/regions/{region.slug}/">← {region.name}</a></p>
<h1>{n.name}</h1>
{#if n.metadata.extractionStatus === 'unreviewed'}<p><span class="badge">Fitxa sense revisar</span> {n.metadata.extractionNote}</p>{/if}
<dl>
	<dt>Secció</dt><dd>{section.order}. {section.name}</dd>
	{#if n.alternativeNames.length}<dt>Altres noms</dt><dd>{n.alternativeNames.join(', ')}</dd>{/if}
	{#if n.semirRef}<dt>Número al plànol de Semir</dt><dd>{n.semirRef}</dd>{/if}
	<dt>Localització</dt>
	<dd>{#if n.location}{n.location.latitude}, {n.location.longitude} ({n.location.accuracy}; font: {n.location.source}){:else}Sense coordenades verificades.{/if}</dd>
	<dt>Descripció original</dt><dd>{n.description ?? 'Encara no extreta.'}</dd>
	<dt>Referències al llibre</dt><dd>{n.bookReferences.map((b) => `p. ${b.page} (${b.type})`).join(', ')}</dd>
</dl>
