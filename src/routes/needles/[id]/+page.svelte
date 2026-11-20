<script lang="ts">
	import { base } from '$app/paths';
	import { KIND_LABEL } from '$lib/data/kinds';
	import NeedleEditor from '$lib/editor/NeedleEditor.svelte';
	import { editor } from '$lib/editor/editor.svelte';
	import BookPages from '$lib/components/Book/BookPages.svelte';
	import MiniMap from '$lib/components/Map/MiniMap.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { regionColor } from '$lib/ui/regions';
	import { dataset, getSection, needlesOf } from '$lib/data/loader';
	let { data } = $props();
	const n = $derived(data.needle);
	const section = $derived(getSection(n.sectionId)!);
	const region = $derived(dataset.regions.find((r) => r.id === n.regionId)!);
	const siblings = $derived(needlesOf(section));
	const idx = $derived(siblings.findIndex((x) => x.id === n.id));
	const prev = $derived(idx > 0 ? siblings[idx - 1] : null);
	const next = $derived(idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null);
	const related = $derived(siblings.filter((x) => x.id !== n.id).slice(0, 8));
	const editing = $derived(__EDITOR__ && editor.on);   // in edit mode the scanned page sits next to the editor, to read/transcribe
	const showDrawings = $derived(__DRAWINGS__ && data.drawings.length > 0);   // public fiche: the book's drawings, never the scanned pages
	const sectionLocated = $derived(siblings.filter((x) => x.location).map((x) => x.id));
</script>

<svelte:head><title>{n.name} · Montserrat Pam a Pam</title></svelte:head>
<nav class="crumbs" aria-label="Camí"><a href="{base}/">Inici</a><span aria-hidden="true">›</span><a href="{base}/regions/{region.slug}/">{region.name}</a><span aria-hidden="true">›</span><a href="{base}/sections/{section.id}/">Secció {section.order}: {section.name}</a></nav>
<header class="page-head needle-head">
	<p class="eyebrow"><span class="dot" style="--c:{regionColor(n.regionId)}"></span> {region.name} · Secció {section.order} · {idx + 1} de {siblings.length}</p>
	<h1>{n.name}</h1>
	<div class="chips">
		{#if n.metadata.extractionStatus === 'unreviewed'}<span class="badge">Fitxa sense revisar</span>{:else}<span class="badge ok">{n.metadata.extractionStatus === 'verified' ? 'Verificada' : 'Revisada'}{#if n.metadata.lastUpdated} · {n.metadata.lastUpdated}{/if}</span>{/if}
		{#if n.kind}<span class="badge neutral">{KIND_LABEL[n.kind]}</span>{/if}
		{#if n.semirRef}<span class="badge neutral">Semir {n.semirRef}</span>{/if}
		<span class="badge neutral"><Icon name="book" size={13} /> p. {n.bookReferences.map((b) => b.page).join(', ')}</span>
		{#if n.location}<span class="badge neutral"><Icon name="pin" size={13} /> al mapa</span>{/if}
	</div>
	{#if n.metadata.extractionStatus === 'unreviewed'}<p class="muted">Extreta automàticament del llibre: el nom i el número poden contenir errors d'OCR.</p>{/if}
	<nav class="stepper" aria-label="Agulla anterior i següent">
		{#if prev}<a class="btn small" href="{base}/needles/{prev.id}/"><Icon name="arrow-left" size={15} /><span class="sr-only">Anterior: </span><span class="t">{prev.name}</span></a>{/if}
		{#if next}<a class="btn small" href="{base}/needles/{next.id}/"><span class="sr-only">Següent: </span><span class="t">{next.name}</span><Icon name="arrow-right" size={15} /></a>{/if}
	</nav>
</header>

{#if editing}
	<div class="edit-grid">
		<NeedleEditor needle={n} ocr={data.ocr} drawings={data.drawings} parts={data.parts} />
		<div class="edit-pages" data-testid="edit-pages"><BookPages needle={n} drawings={data.drawings} scans /></div>
	</div>
{/if}

<div class="needle-grid" class:solo={editing || !showDrawings}>
<div class="needle-info">
<section aria-label="Text original del llibre">
	{#if data.parts.length}
		{#each data.parts as part (part.id)}
			<div class="text-part" data-testid="text-part">
				{#if !part.own}<h3 class="part-name">{part.name} <small class="muted">(entrada fusionada, p. {part.page})</small></h3>{/if}
				{#if part.description}
					<blockquote class="original">{part.description}</blockquote>
				{:else if part.ocr}
					<p><span class="badge">Text OCR sense revisar</span></p>
					<blockquote class="original ocr" lang="ca">{part.ocr.text}</blockquote>
				{:else}
					<p class="muted">Sense transcripció: consulteu la pàgina {part.page} del llibre.</p>
				{/if}
			</div>
		{/each}
	{:else if n.description}
		<blockquote class="original">{n.description}</blockquote>
	{:else if data.ocr}
		<p><span class="badge">Text OCR sense revisar</span> Pot contenir errors de lectura; en cas de dubte, el llibre és la font.
			{#if !data.ocr.headingFound || !data.ocr.endFound || data.ocr.meanConf < 60}<strong>Els límits o la qualitat d'aquest fragment són dubtosos.</strong>{/if}</p>
		<blockquote class="original ocr" lang="ca">{data.ocr.text}</blockquote>
	{:else}
		<p>La transcripció del text original encara no està disponible: consulteu la pàgina del llibre.</p>
	{/if}
	{#if n.normalRoute}<h3>Via normal</h3><blockquote class="original">{n.normalRoute}</blockquote>{/if}
	{#if n.otherRoutes?.length}<h3>Altres vies</h3><ul>{#each n.otherRoutes as r}<li>{r}</li>{/each}</ul>{/if}
	<p class="muted">Font: <em>Montserrat pam a pam</em>, {n.bookReferences.map((b) => `p. ${b.page}`).join(', ')}.</p>
</section>

<section aria-labelledby="h-loc">
	<h2 id="h-loc">Localització</h2>
	{#if n.location}
		<p class="muted">{n.location.latitude.toFixed(5)}, {n.location.longitude.toFixed(5)}{n.location.elevation ? ` · ${n.location.elevation} m` : ''} ({n.location.accuracy === 'verified' ? 'verificada' : 'aproximada'}; font: {n.location.source})</p>
		<MiniMap selected={n.id} href="{base}/map/?needle={n.id}" label="Mapa: {n.name}" />
		<p><a href="{base}/map/?needle={n.id}">Veure al mapa</a> · <a href="{base}/vista/?lat={n.location.latitude}&lon={n.location.longitude}">Vista des del cim (simulada)</a></p>
	{:else}
		<p class="muted">Sense coordenades verificades{sectionLocated.length ? `; el mapa mostra les ${sectionLocated.length} agulles localitzades de la secció` : ''}.</p>
		{#if sectionLocated.length}<MiniMap focusIds={sectionLocated} href="{base}/map/?needle={n.id}" label="Mapa de la secció {section.name}" />{/if}
		<p><a href="{base}/map/?section={section.id}">Veure la secció al mapa</a></p>
	{/if}
</section>

<section aria-labelledby="h-meta">
	<h2 id="h-meta">Dades de la fitxa</h2>
	<dl class="facts">
		{#if n.alternativeNames.length}<dt>Altres noms</dt><dd>{n.alternativeNames.join(', ')}</dd>{/if}
		{#if n.semirRef}<dt>Número al plànol de Semir</dt><dd>{n.semirRef}</dd>{/if}
		<dt>Regió i secció</dt><dd>{region.name} · {section.name}</dd>
		<dt>Pàgina del llibre</dt><dd>{n.bookReferences[0].page}</dd>
		<dt>Identificador</dt><dd><code>{n.id}</code></dd>
	</dl>
	{#if n.historicalNotes?.length}<h3>Notes històriques</h3><ul>{#each n.historicalNotes as h}<li>{h}</li>{/each}</ul>{/if}
</section>
</div>
{#if !editing && showDrawings}<div class="needle-pages"><BookPages needle={n} drawings={data.drawings} /></div>{/if}
</div>


{#if related.length}
	<section aria-labelledby="h-rel">
		<h2 id="h-rel">Altres agulles de la secció</h2>
		<ul class="needle-list">{#each related as r (r.id)}<li><a href="{base}/needles/{r.id}/"><span class="dot" style="--c:{regionColor(r.regionId)}"></span><span class="nm">{r.name}</span></a></li>{/each}</ul>
	</section>
{/if}
<nav aria-label="Agulles veïnes" class="pn">
	{#if prev}<a class="prev" href="{base}/needles/{prev.id}/" rel="prev"><small>← Anterior</small>{prev.name}</a>{/if}
	{#if next}<a class="next" href="{base}/needles/{next.id}/" rel="next"><small>Següent →</small>{next.name}</a>{/if}
</nav>

<style>
	.needle-head h1 { margin-bottom: .5rem; }
	.needle-head .chips :global(svg) { vertical-align: -2px; }
	.stepper { display: flex; justify-content: space-between; gap: .5rem; flex-wrap: wrap; margin-top: .75rem; }
	.stepper a { max-width: 48%; min-width: 0; }
	.stepper .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.stepper a:only-child:last-child { margin-left: auto; }
</style>
