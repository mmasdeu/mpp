<script lang="ts">
	import { base } from '$app/paths';
	import { getSection, needlesOf } from '$lib/data/loader';
	let { data } = $props();
	const sections = $derived(data.region.sectionIds.map((id) => getSection(id)!));
</script>

<svelte:head><title>{data.region.name} · Montserrat Pam a Pam</title></svelte:head>
<p><a href="{base}/">← Regions</a></p>
<h1>Regió {data.region.name}</h1>
{#each sections as s (s.id)}
	{@const ns = needlesOf(s)}
	<section>
		<h2>Secció {s.order}: {s.name} <small>(p. {s.bookReference?.pageStart}–{s.bookReference?.pageEnd})</small></h2>
		{#if ns.length}
			<ul class="plain">
				{#each ns as n (n.id)}
					<li><a href="{base}/needles/{n.id}/">{n.name}</a> {#if n.metadata.extractionStatus === 'unreviewed'}<span class="badge">sense revisar</span>{/if}</li>
				{/each}
			</ul>
		{:else}
			<p>Cap agulla extreta encara per a aquesta secció.</p>
		{/if}
	</section>
{/each}
