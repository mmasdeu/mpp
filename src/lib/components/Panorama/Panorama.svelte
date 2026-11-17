<script lang="ts">
	import { base } from '$app/paths';
	import { getNeedle } from '$lib/data/loader';
	import type { Panorama } from '$lib/data/types';
	let { panorama }: { panorama: Panorama } = $props();
	const ZOOMS = [1, 1.5, 2, 3, 4];
	let zi = $state(0);
	let selected = $state<number | null>(null);
	const items = $derived(panorama.annotations.map((a, i) => ({ ...a, n: i + 1, needle: getNeedle(a.needleId) })));
	const sel = $derived(selected === null ? null : items[selected]);
	const alt = $derived(`${panorama.title}. ${items.length} agulles anotades: ${items.map((i) => i.label ?? i.needle?.name).join(', ')}.`);
</script>

<div class="toolbar" role="group" aria-label="Zoom del panoràmic">
	<button type="button" onclick={() => (zi = Math.max(0, zi - 1))} disabled={zi === 0} aria-label="Allunya">−</button>
	<span aria-live="polite">{ZOOMS[zi] * 100}%</span>
	<button type="button" onclick={() => (zi = Math.min(ZOOMS.length - 1, zi + 1))} disabled={zi === ZOOMS.length - 1} aria-label="Apropa">+</button>
</div>
<div class="pano-scroll" tabindex="-1">
	<div class="pano-inner" style="width: {ZOOMS[zi] * 100}%; aspect-ratio: {panorama.width} / {panorama.height}">
		<img src="{base}/images/panoramas/{panorama.filename}" {alt} width={panorama.width} height={panorama.height} loading="lazy" />
		{#each items as a (a.n)}
			<button type="button" class="pin" class:on={selected === a.n - 1} style="left: {a.x * 100}%; top: {a.y * 100}%"
				aria-label="{a.label ?? a.needle?.name}" aria-pressed={selected === a.n - 1} onclick={() => (selected = selected === a.n - 1 ? null : a.n - 1)}>{a.n}</button>
		{/each}
	</div>
</div>
{#if sel}
	<p class="pano-card" role="status"><strong>{sel.n}. {sel.label ?? sel.needle?.name}</strong> · <a href="{base}/needles/{sel.needleId}/">Obre la fitxa</a></p>
{/if}

<h2>Agulles d'aquest panoràmic</h2>
<ol class="plain-ol">
	{#each items as a (a.n)}
		<li><a href="{base}/needles/{a.needleId}/">{a.label ?? a.needle?.name}</a></li>
	{/each}
</ol>

<style>
	.toolbar { display: flex; gap: .75rem; align-items: center; margin: .5rem 0; }
	.toolbar button { font: inherit; min-width: 2.75rem; min-height: 2.75rem; }
	.pano-scroll { overflow-x: auto; border: 1px solid var(--line); background: #eee; touch-action: pan-x pan-y pinch-zoom; }
	.pano-inner { position: relative; }
	.pano-inner img { display: block; width: 100%; height: auto; }
	.pin { position: absolute; transform: translate(-50%, -50%); min-width: 2rem; height: 2rem; border-radius: 1rem; border: 2px solid #fff; background: var(--accent); color: #fff; font: inherit; font-size: .8rem; cursor: pointer; padding: 0 .3rem; }
	.pin.on, .pin:focus-visible { outline: 3px solid #0a5; background: #5a1f00; }
	.pano-card { background: #f4efe4; padding: .5rem .75rem; border-left: 4px solid var(--accent); }
	.plain-ol { columns: 2 14rem; }
</style>
