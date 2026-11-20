<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { base } from '$app/paths';
	import { BOOK_PAGES, pageItems, sectionAt } from '$lib/data/book-index';
	import { regionColor } from '$lib/ui/regions';
	import Icon from '$lib/ui/Icon.svelte';

	// /llibre/?p=123 — the scanned book, one page per screen: swipe (or arrows) to turn pages; below/beside it, what the web has
	// for that page (needles, drawings, sections…), to open its fiche.
	let strip: HTMLDivElement;
	let page = $state(1);
	let ready = $state(false);
	const pages = Array.from({ length: BOOK_PAGES }, (_, i) => i + 1);
	const n3 = (p: number) => String(p).padStart(3, '0');
	const items = $derived(pageItems(page));
	const starts = $derived(items.filter((x) => x.starts));
	const continues = $derived(items.filter((x) => !x.starts));
	const section = $derived(sectionAt(page));
	const KIND: Record<string, string> = { agulla: 'Agulla', dibuix: 'Dibuix', secció: 'Secció', regió: 'Regió', mapa: 'Mapa', panoràmica: 'Panoràmica', escalador: 'Escalador', llibre: 'Llibre' };

	function go(p: number, smooth = true) {
		p = Math.max(1, Math.min(BOOK_PAGES, Math.round(p) || 1));
		strip?.scrollTo({ left: (p - 1) * strip.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
		page = p;
	}
	let urlTimer: ReturnType<typeof setTimeout> | undefined;
	function onScroll() {
		if (!strip || !strip.clientWidth) return;
		const p = Math.round(strip.scrollLeft / strip.clientWidth) + 1;
		if (p !== page) page = p;
		clearTimeout(urlTimer);
		urlTimer = setTimeout(() => history.replaceState(history.state, '', `?p=${page}`), 250);
	}
	function key(e: KeyboardEvent) {
		if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
		if (e.key === 'ArrowRight' || e.key === 'PageDown') { go(page + 1); e.preventDefault(); }
		else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { go(page - 1); e.preventDefault(); }
	}
	onMount(async () => {
		const p = Number(new URLSearchParams(location.search).get('p'));
		await tick();
		go(p >= 1 && p <= BOOK_PAGES ? p : 1, false);
		ready = true;
		// keep the same page in view when the strip is resized (rotation, window resize)
		ro = new ResizeObserver(() => strip.scrollTo({ left: (page - 1) * strip.clientWidth }));
		ro.observe(strip);
	});
	let ro: ResizeObserver | undefined;
	onDestroy(() => { ro?.disconnect(); clearTimeout(urlTimer); });
	// only the pages around the current one load their image
	const near = (p: number) => Math.abs(p - page) <= 2;
</script>

<svelte:head><title>Llibre, pàgina {page} · Montserrat Pam a Pam</title></svelte:head>
<svelte:window onkeydown={key} />

<h1 class="sr-only">El llibre escanejat</h1>
<div class="book">
	<div class="viewer">
		<div class="strip" bind:this={strip} onscroll={onScroll} role="region" aria-roledescription="carrusel" aria-label="Pàgines del llibre" tabindex="-1" data-testid="book-strip">
			{#each pages as p (p)}
				<figure class="slide" aria-label="Pàgina {p}" aria-hidden={p !== page}>
					{#if !__BOOK_IMAGES__}
						<div class="placeholder">Pàgina {p}<br /><small>Les imatges del llibre no s'inclouen en aquesta versió (drets d'autor).</small></div>
					{:else if near(p) && ready}
						<img src="{base}/images/book/p{n3(p)}.webp" alt="Pàgina {p} de «Montserrat pam a pam»" width="698" height="1071" decoding="async" draggable="false" />
					{:else}
						<div class="placeholder" aria-hidden="true">{p}</div>
					{/if}
				</figure>
			{/each}
		</div>
		<div class="controls">
			<button type="button" class="btn small" onclick={() => go(page - 1)} disabled={page <= 1} aria-label="Pàgina anterior"><Icon name="arrow-left" size={16} /></button>
			<label class="pageno">Pàgina <input type="number" min="1" max={BOOK_PAGES} value={page} onchange={(e) => go(Number((e.currentTarget as HTMLInputElement).value))} aria-label="Número de pàgina" data-testid="page-input" /> / {BOOK_PAGES}</label>
			<button type="button" class="btn small" onclick={() => go(page + 1)} disabled={page >= BOOK_PAGES} aria-label="Pàgina següent"><Icon name="arrow-right" size={16} /></button>
		</div>
		<input class="slider" type="range" min="1" max={BOOK_PAGES} value={page} oninput={(e) => go(Number((e.currentTarget as HTMLInputElement).value), false)} aria-label="Pàgina del llibre" />
	</div>

	<aside class="items" aria-labelledby="h-items">
		<h2 id="h-items">Pàgina {page}</h2>
		{#if section}<p class="muted">Secció {section.order}: <a href="{base}/sections/{section.id}/">{section.name}</a></p>{/if}
		{#if starts.length}
			<ul class="plain list" data-testid="page-items">
				{#each starts as it (it.kind + it.id)}
					<li style:--c={it.regionId ? regionColor(it.regionId) : 'var(--muted)'}><span class="kind">{KIND[it.kind]}</span> <a href="{base}{it.href}">{it.name}</a></li>
				{/each}
			</ul>
		{/if}
		{#if continues.length}
			<h3 class="cont">Continua d'abans</h3>
			<ul class="plain list">
				{#each continues as it (it.kind + it.id)}
					<li style:--c={it.regionId ? regionColor(it.regionId) : 'var(--muted)'}><span class="kind">{KIND[it.kind]}</span> <a href="{base}{it.href}">{it.name}</a></li>
				{/each}
			</ul>
		{/if}
		{#if !items.length}<p class="muted">En aquesta pàgina no comença cap fitxa.</p>{/if}
		<p class="muted small">Llisca la pàgina (o fes servir les fletxes del teclat) per passar-la.</p>
	</aside>
</div>

<style>
	.book { display: grid; gap: 1rem; }
	@media (min-width: 62rem) { .book { grid-template-columns: minmax(0, 1fr) 20rem; align-items: start; } .items { position: sticky; top: 4.5rem; } }
	.viewer { min-width: 0; }
	.strip { display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scrollbar-width: none; overscroll-behavior-x: contain;
		height: min(calc(100dvh - 12rem), 75rem); background: var(--surface-2); border-radius: var(--radius); outline: none; }
	.strip::-webkit-scrollbar { display: none; }
	/* phone: a shorter page so the list of fiches starts on screen, right below the controls */
	@media (max-width: 61.99rem) { .strip { height: max(20rem, calc(100dvh - 24rem)); } .slider { display: none; } .items h2 { font-size: 1.1rem; } }
	.slide { flex: 0 0 100%; height: 100%; margin: 0; scroll-snap-align: start; scroll-snap-stop: always; display: grid; place-items: center; padding: .5rem; }
	.slide img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; background: #fff; box-shadow: var(--shadow-2); user-select: none; }
	.placeholder { color: var(--muted); font-size: 2rem; text-align: center; }
	.placeholder small { font-size: .85rem; }
	.controls { display: flex; justify-content: center; align-items: center; gap: .75rem; margin-top: .5rem; }
	.pageno input { width: 4.5rem; text-align: center; }
	.slider { width: 100%; margin-top: .25rem; }
	.items h2 { margin-top: 0; }
	.list li { padding: .35rem 0 .35rem .6rem; border-left: 4px solid var(--c); margin-bottom: .3rem; }
	.kind { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); display: block; }
	.cont { font-size: .95rem; margin: 1rem 0 .4rem; }
	.small { font-size: .82rem; }
</style>
