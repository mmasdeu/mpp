<script lang="ts">
	import { needlesGeoJSON as geo_fc } from '$lib/geography/needles-fc';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import type { Component } from 'svelte';
	/** Small map embedded in region/section/needle pages; MapLibre is only loaded when the map scrolls into view. */
	let { focusIds = null, selected = null, href, label = 'Mapa' }: { focusIds?: string[] | null; selected?: string | null; href: string; label?: string } = $props();
	let el: HTMLDivElement;
	let MapC = $state<Component<any> | null>(null);
	let terrain = $state(false);
	onMount(() => {
		const io = new IntersectionObserver(async ([e]) => {
			if (!e.isIntersecting) return;
			io.disconnect();
			MapC = (await import('./Map.svelte')).default;
		}, { rootMargin: '200px' });
		io.observe(el);
		return () => io.disconnect();
	});
</script>

<div class="mini card" bind:this={el}>
	{#if MapC}
		<MapC data={geo_fc} {focusIds} {selected} compact {label} bind:terrain
			padding={{ top: 40, right: 60, bottom: 40, left: 40 }}
			onselect={(id: string | null) => id && id !== selected && goto(`${base}/needles/${id}/`)} />
	{:else}
		<div class="ph" aria-hidden="true"><Icon name="map" size={28} /></div>
	{/if}
	<a class="open btn small" href={href}><Icon name="expand" size={15} /> Mapa gran</a>
</div>

<style>
	.mini { position: relative; height: clamp(15rem, 40vh, 24rem); overflow: hidden; padding: 0; }
	.ph { display: grid; place-items: center; height: 100%; color: var(--muted); background: var(--surface-2); }
	.open { position: absolute; left: .6rem; top: .6rem; z-index: 3; background: #fff; color: #222; border: 0; box-shadow: var(--shadow-2); }
</style>
