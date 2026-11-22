<script lang="ts">
	import { base } from '$app/paths';
	import { dataset, getSection, needleCount } from '$lib/data/loader';
	import { regionColor } from '$lib/ui/regions';
	let { data } = $props();
	const located = (rid: string) => dataset.needles.filter((n) => n.regionId === rid && n.location).length;
</script>

<svelte:head><title>Montserrat Pam a Pam · Inici</title></svelte:head>
<header class="page-head">
	<p class="eyebrow">Edició digital de l'obra de Josep Barberà (1977)</p>
	<h1>Montserrat Pam a Pam</h1>
	<p class="lead">{dataset.needles.length} agulles, roques i cims en {dataset.sections.length} seccions i {dataset.regions.length} regions. <a href="{base}/map/">Obre el mapa interactiu</a>.</p>
</header>
{#if __DRAWINGS__ || __BOOK_IMAGES__}
	{@const src = __DRAWINGS__ ? `${base}/images/drawings/d007.webp` : `${base}/images/book/p007.webp`}
	<figure class="book-map" class:cutout={__DRAWINGS__}>
		<a href="{base}/map/" aria-label="Obre el mapa interactiu de les agulles"><img {src} alt="Mapa de Montserrat en 35 seccions, escala 1:28.000 (pàgina 7 del llibre)" width="1071" height="698" /></a>
		<figcaption class="muted">Mapa de les 35 seccions (llibre, p. 7).</figcaption>
	</figure>
{/if}
<h2 class="regions-title">Les sis regions</h2>
<ul class="card-grid regions">
	{#each dataset.regions as r, i (r.id)}
		<li>
			<a class="card region" href="{base}/regions/{r.slug}/" style="--c:{regionColor(r.id)}">
				<span class="num" aria-hidden="true">{i + 1}</span>
				<h3>{r.name}</h3>
				<p class="stats"><strong>{r.sectionIds.length}</strong> seccions · <strong>{needleCount(r)}</strong> agulles · <strong>{located(r.id)}</strong> al mapa{r.bookReference?.pageStart ? ` · p. ${r.bookReference.pageStart}` : ''}</p>
				<p class="secs">{r.sectionIds.map((id) => getSection(id)?.name).join(' · ')}</p>
			</a>
		</li>
	{/each}
</ul>
<p class="cta"><a class="btn primary" href="{base}/map/">Explora-les al mapa</a></p>

{#each data.front as f (f.id)}
	{#if f.text}
		<section class="front reading-col" aria-labelledby="h-{f.id}" data-testid="front-{f.id}">
			<h2 id="h-{f.id}">{f.title}</h2>
			{#each f.text.split('\n\n') as para}{#if para === '* * *'}<p class="sep" aria-hidden="true">* * *</p>{:else}<p>{para}</p>{/if}{/each}
			{#if f.author}<p class="sign">{f.author}</p>{/if}
			<p class="muted small">Llibre, {f.pages.length > 1 ? `pàgines ${f.pages[0]}–${f.pages[f.pages.length - 1]}` : `pàgina ${f.pages[0]}`}{f.reviewed ? '' : ' · transcripció OCR sense revisar'}.</p>
		</section>
	{/if}
{/each}

<style>
	.book-map { margin: 0 0 1.5rem; }
	.book-map img { width: 100%; max-width: 1071px; height: auto; border: 1px solid var(--border, #ccc); }
	.book-map.cutout img { border: 0; }
	.region { position: relative; height: 100%; padding: 1.25rem 1.25rem 1.1rem; border-top: 4px solid var(--c); }
	.region h3 { margin: .1rem 0 .4rem; font-size: 1.4rem; font-family: var(--font-display); }
	.num { position: absolute; top: .9rem; right: 1rem; font-family: var(--font-display); font-size: 2rem; line-height: 1; color: color-mix(in srgb, var(--c) 55%, transparent); font-weight: 700; }
	.stats { margin: 0 0 .5rem; color: var(--muted); font-size: .9rem; }
	.stats strong { color: var(--fg); }
	.secs { margin: 0; font-size: .85rem; color: var(--muted); line-height: 1.45; }
	.cta { margin-top: 1.5rem; }
	.front { max-width: 42rem; margin: 3rem 0 1rem; padding-top: 1.5rem; border-top: 1px solid var(--line); line-height: 1.7; hyphens: auto; text-wrap: pretty; }
	.front p { margin: 0 0 1em; }
	.front .sep { text-align: center; letter-spacing: .5em; color: var(--muted); }
	.front .sign { text-align: right; font-variant: small-caps; font-weight: 600; }
	.front .small { font-size: .82rem; }
</style>
