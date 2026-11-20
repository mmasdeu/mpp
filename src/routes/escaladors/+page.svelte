<script lang="ts">
	import { base } from '$app/paths';
	let { data } = $props();
</script>

<svelte:head><title>Escaladors montserratins · Montserrat Pam a Pam</title></svelte:head>
<div class="reading">
<header class="page-head">
	<p class="eyebrow">Llibre, pàgines 392–397</p>
	<h1>Biografies d'escaladors montserratins</h1>
	<p class="lead">{data.list.length} escaladors, per ordre alfabètic com al llibre. Text OCR del llibre, pendent de revisió.</p>
</header>
<ul class="plain bio-list">
	{#each data.list as b (b.id)}
		<li><a href="{base}/escaladors/{b.id}/">{b.name}</a> <small class="muted">p. {b.pages.join('–')}</small></li>
	{/each}
</ul>
</div>
<style>.bio-list li { padding: .35rem 0; border-bottom: 1px solid var(--border, #ddd); }</style>
