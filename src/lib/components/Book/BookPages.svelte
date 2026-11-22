<script lang="ts">
	import { base } from '$app/paths';
	import type { Needle } from '$lib/data/types';
	/** scans: also show the scanned book pages (only in the editor and the review tool, to read the original text; public fiches show the drawings only) */
	let { needle, drawings = [], scans = false }: { needle: Needle; drawings?: number[]; scans?: boolean } = $props();
	const pages = $derived([...new Set(needle.bookReferences.map((b) => b.page))].sort((a, b) => a - b));
	// every drawing page is shown as a cut-out; a drawing page that is only an *estimated* continuation
	// is not repeated as a plain scan (the needle's own first page always stays)
	const plates = $derived(drawings);
	const textPages = $derived(pages.filter((p, i) => i === 0 || !drawings.includes(p)));
	const url = (p: number) => `${base}/images/book/p${String(p).padStart(3, '0')}.webp`;
	let failed = $state<Record<number, boolean>>({});
	let cropFailed = $state<Record<number, boolean>>({});
	// a cut-out is shown at the size it has on the printed page: its share of the page width (300 dpi render = 1610 px wide) of the column that holds the page scan
	const PAGE_PX = 1610;
	let plateW = $state<Record<number, number>>({});
	const drawingUrl = (p: number) => `${base}/images/drawings/d${String(p).padStart(3, '0')}.webp`;
</script>

{#if scans || (__DRAWINGS__ && drawings.length)}
<section class="book" aria-label={scans ? 'Pàgina del llibre' : drawings.length > 1 ? 'Dibuixos del llibre' : 'Dibuix del llibre'}>
	{#if scans && !__BOOK_IMAGES__ && !__DRAWINGS__}
		<p class="muted">Les imatges de les pàgines del llibre no s'inclouen en aquesta versió (drets d'autor). Consulteu {pages.length > 1 ? 'les pàgines' : 'la pàgina'} {pages.join(', ')} de <em>Montserrat pam a pam</em>.</p>
	{:else}
		{#each plates.filter((p) => (scans && __BOOK_IMAGES__) || !cropFailed[p]) as p (p)}
			<figure class="plate" data-testid="drawing">
				<!-- transparent cut-out of the drawing, shown as a plain drawing; falls back to the whole scanned page if the cut-out is not deployed -->
				<a href="{base}/sections/{needle.sectionId}/" aria-label="Mostra la secció de {needle.name}"><img src={cropFailed[p] ? url(p) : drawingUrl(p)} loading="lazy" decoding="async" class:ink={!cropFailed[p]}
					style:width={!cropFailed[p] && plateW[p] ? `${Math.min((plateW[p] / PAGE_PX) * 100, 100)}%` : undefined}
					onload={(e) => { if (!cropFailed[p]) plateW[p] = (e.currentTarget as HTMLImageElement).naturalWidth; }}
					alt="Dibuix de {needle.name} amb les vies d'escalada (pàgina {p} del llibre)" onerror={() => (cropFailed[p] = true)} /></a>
				<figcaption>Dibuix · pàgina {p} · © Publicacions de l'Abadia de Montserrat, 1977</figcaption>
			</figure>
		{/each}
		{#if scans && !__BOOK_IMAGES__}<p class="muted">Les imatges de les pàgines del llibre no s'inclouen en aquesta versió. Consulteu {pages.length > 1 ? 'les pàgines' : 'la pàgina'} {pages.join(', ')} de <em>Montserrat pam a pam</em>.</p>{/if}
		{#each scans && __BOOK_IMAGES__ ? textPages : [] as p, i (p)}
			<figure>
				{#if failed[p]}
					<p class="muted">No s'ha pogut carregar la imatge de la pàgina {p} (potser no està desada per a l'ús sense connexió).</p>
				{:else}
					<a href="{base}/llibre/?p={p}" aria-label="Obre la pàgina {p} al llibre">
						<img src={url(p)} width="698" height="1071" loading={i === 0 ? 'eager' : 'lazy'} decoding="async"
							alt="Pàgina {p} de «Montserrat pam a pam», amb l'entrada {needle.name}" onerror={() => (failed[p] = true)} />
					</a>
				{/if}
				<figcaption>Pàgina {p}{i > 0 ? ' (estimada)' : ''} · © Publicacions de l'Abadia de Montserrat, 1977</figcaption>
			</figure>
		{/each}
	{/if}
</section>
{/if}

<style>
	figure { margin: 0 0 1rem; }
	figure img { width: 100%; height: auto; border: 1px solid var(--line); background: #fff; display: block; border-radius: var(--radius-s); }
	figure.plate { margin-bottom: 1.5rem; }
	figure.plate img.ink { width: auto; max-width: 100%; margin: 0 auto; border: 0; background: none; border-radius: 0; }
	figcaption { font-size: .8rem; color: var(--muted); margin-top: .25rem; }
</style>
