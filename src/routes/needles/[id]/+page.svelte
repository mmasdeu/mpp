<script lang="ts">
	import { base } from '$app/paths';
	import { dataset, getSection, needlesOf, panoramasFor } from '$lib/data/loader';
	let { data } = $props();
	const n = $derived(data.needle);
	const section = $derived(getSection(n.sectionId)!);
	const region = $derived(dataset.regions.find((r) => r.id === n.regionId)!);
	const siblings = $derived(needlesOf(section));
	const idx = $derived(siblings.findIndex((x) => x.id === n.id));
	const prev = $derived(idx > 0 ? siblings[idx - 1] : null);
	const next = $derived(idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null);
	const panos = $derived(panoramasFor(n.id));
	const related = $derived(siblings.filter((x) => x.id !== n.id).slice(0, 8));
</script>

<svelte:head><title>{n.name} · Montserrat Pam a Pam</title></svelte:head>
<nav aria-label="Camí"><a href="{base}/">Regions</a> › <a href="{base}/regions/{region.slug}/">{region.name}</a> › <a href="{base}/sections/{section.id}/">Secció {section.order}: {section.name}</a></nav>
<h1>{n.name}</h1>
{#if n.metadata.extractionStatus === 'unreviewed'}
	<p><span class="badge">Fitxa sense revisar</span> {n.metadata.extractionNote}</p>
{:else}
	<p><span class="badge ok">{n.metadata.extractionStatus === 'verified' ? 'Verificada' : 'Revisada'}</span>{#if n.metadata.lastUpdated} {n.metadata.lastUpdated}{/if}</p>
{/if}

<section aria-labelledby="h-loc">
	<h2 id="h-loc">Localització</h2>
	{#if n.location}
		<p>{n.location.latitude.toFixed(5)}, {n.location.longitude.toFixed(5)}{n.location.elevation ? ` · ${n.location.elevation} m` : ''} ({n.location.accuracy === 'verified' ? 'verificada' : 'aproximada'}; font: {n.location.source})</p>
		<p><a href="{base}/map/?needle={n.id}">Veure al mapa</a></p>
	{:else}
		<p>Sense coordenades verificades. <a href="{base}/map/?section={section.id}">Veure la secció al mapa</a></p>
	{/if}
</section>

<section aria-labelledby="h-orig">
	<h2 id="h-orig">Text original del llibre</h2>
	{#if n.description}
		<blockquote class="original">{n.description}</blockquote>
	{:else}
		<p>Encara no s'ha extret el text original d'aquesta fitxa.</p>
	{/if}
	{#if n.normalRoute}<h3>Via normal</h3><blockquote class="original">{n.normalRoute}</blockquote>{/if}
	{#if n.otherRoutes?.length}<h3>Altres vies</h3><ul>{#each n.otherRoutes as r}<li>{r}</li>{/each}</ul>{/if}
	<p class="muted">Font: <em>Montserrat pam a pam</em>, {n.bookReferences.map((b) => `p. ${b.page} (${b.type})`).join(', ')}.</p>
</section>

<section aria-labelledby="h-meta">
	<h2 id="h-meta">Dades de la fitxa</h2>
	<dl>
		{#if n.alternativeNames.length}<dt>Altres noms</dt><dd>{n.alternativeNames.join(', ')}</dd>{/if}
		{#if n.semirRef}<dt>Número al plànol de Semir</dt><dd>{n.semirRef}</dd>{/if}
		<dt>Regió i secció</dt><dd>{region.name} · {section.name}</dd>
		<dt>Identificador</dt><dd><code>{n.id}</code></dd>
	</dl>
	{#if n.historicalNotes?.length}<h3>Notes històriques</h3><ul>{#each n.historicalNotes as h}<li>{h}</li>{/each}</ul>{/if}
</section>

{#if panos.length}
	<section aria-labelledby="h-pano">
		<h2 id="h-pano">Apareix als panorames</h2>
		<ul class="plain">{#each panos as p (p.id)}<li><a href="{base}/panoramas/{p.id}/">{p.title}</a></li>{/each}</ul>
	</section>
{/if}

{#if related.length}
	<section aria-labelledby="h-rel">
		<h2 id="h-rel">Altres agulles de la secció</h2>
		<ul class="plain">{#each related as r (r.id)}<li><a href="{base}/needles/{r.id}/">{r.name}</a></li>{/each}</ul>
	</section>
{/if}
<nav aria-label="Agulles veïnes" class="pn">
	{#if prev}<a href="{base}/needles/{prev.id}/" rel="prev">← {prev.name}</a>{:else}<span></span>{/if}
	{#if next}<a href="{base}/needles/{next.id}/" rel="next">{next.name} →</a>{/if}
</nav>
