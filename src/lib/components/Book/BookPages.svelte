<script lang="ts">
	import { base } from '$app/paths';
	import type { Needle } from '$lib/data/types';
	let { needle }: { needle: Needle } = $props();
	const pages = $derived([...new Set(needle.bookReferences.map((b) => b.page))].sort((a, b) => a - b));
	const url = (p: number) => `${base}/images/book/p${String(p).padStart(3, '0')}.webp`;
	const heading = $derived(`${needle.name.toUpperCase()}${needle.semirRef ? ` (${needle.semirRef})` : ''}`);
	let failed = $state<Record<number, boolean>>({});
</script>

<section class="book" aria-labelledby="h-book">
	<h2 id="h-book">Pàgina del llibre</h2>
	{#if !__BOOK_IMAGES__}
		<p class="muted">Les imatges de les pàgines del llibre no s'inclouen en aquesta versió (drets d'autor). Consulteu {pages.length > 1 ? 'les pàgines' : 'la pàgina'} {pages.join(', ')} de <em>Montserrat pam a pam</em>.</p>
	{:else}
		<p class="muted">Cerqueu l'entrada <strong>{heading}</strong> a la pàgina {pages[0]}{pages.length > 1 ? `; el text pot continuar a ${pages.length > 2 ? 'les pàgines' : 'la pàgina'} ${pages.slice(1).join(', ')}` : ''}. Transcripció del text: pendent.</p>
		{#each pages as p, i (p)}
			<figure>
				{#if failed[p]}
					<p class="muted">No s'ha pogut carregar la imatge de la pàgina {p} (potser no està desada per a l'ús sense connexió).</p>
				{:else}
					<a href={url(p)} target="_blank" rel="noopener" aria-label="Obre la pàgina {p} a mida completa (nova pestanya)">
						<img src={url(p)} width="698" height="1071" loading={i === 0 ? 'eager' : 'lazy'} decoding="async"
							alt="Pàgina {p} de «Montserrat pam a pam», amb l'entrada {needle.name}" onerror={() => (failed[p] = true)} />
					</a>
				{/if}
				<figcaption>Pàgina {p}{i > 0 ? ' (estimada)' : ''} · © Publicacions de l'Abadia de Montserrat, 1977</figcaption>
			</figure>
		{/each}
	{/if}
</section>

<style>
	figure { margin: 0 0 1rem; }
	figure img { width: 100%; height: auto; border: 1px solid var(--line); background: #fff; display: block; }
	figcaption { font-size: .8rem; color: var(--muted); margin-top: .25rem; }
</style>
