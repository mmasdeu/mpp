<script lang="ts">
	import { base } from '$app/paths';
	/** Transparent cut-outs of book drawings/maps (static/images/drawings/dNNN.webp); falls back to the whole scanned page. */
	/** href: where a click on the image goes (the map of the section/region); the image is never opened on its own */
	let { pages, alt, label = 'Mapa', testid = 'map', href }: { pages: number[]; alt: string; label?: string; testid?: string; href?: string } = $props();
	const n3 = (p: number) => String(p).padStart(3, '0');
	let failed = $state<Record<number, boolean>>({});
	const src = (p: number) => (failed[p] ? `${base}/images/book/p${n3(p)}.webp` : `${base}/images/drawings/d${n3(p)}.webp`);
</script>

{#each pages as p (p)}
	<figure class="cutout-fig" data-testid={testid}>
		{#if href}
			<a {href} aria-label="Mostra al mapa interactiu: {alt}">
				<img src={src(p)} loading="lazy" decoding="async" class:ink={!failed[p]} alt="{label} de {alt} (pàgina {p} del llibre)" onerror={() => (failed[p] = true)} />
			</a>
		{:else}
			<img src={src(p)} loading="lazy" decoding="async" class:ink={!failed[p]} alt="{label} de {alt} (pàgina {p} del llibre)" onerror={() => (failed[p] = true)} />
		{/if}
		<figcaption>{label} · pàgina {p} · © Publicacions de l'Abadia de Montserrat, 1977</figcaption>
	</figure>
{/each}

<style>
	figure { margin: 0 0 1rem; max-width: 520px; }
	img { width: 100%; height: auto; display: block; }
	img:not(.ink) { border: 1px solid var(--line); background: #fff; border-radius: var(--radius-s); }
	figcaption { font-size: .8rem; color: var(--muted); margin-top: .25rem; }
</style>
