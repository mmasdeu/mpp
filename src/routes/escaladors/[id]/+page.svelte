<script lang="ts">
	import { base } from '$app/paths';
	let { data } = $props();
	const b = $derived(data.bio);
</script>

<svelte:head><title>{b.name} · Escaladors · Montserrat Pam a Pam</title></svelte:head>
<article class="reading">
<p class="muted"><a href="{base}/escaladors/">← Escaladors montserratins</a></p>
<h1>{b.name}</h1>
{#if b.text}
	{#each b.text.split('\n\n') as para}<p class="bio-text">{para}</p>{/each}
	<p class="muted">Transcripció OCR sense revisar.</p>
{:else}
	<p class="muted">Text no disponible en aquesta còpia.</p>
{/if}
<dl class="facts"><dt>Pàgina del llibre</dt><dd>{b.pages.join(', ')}</dd></dl>
<p class="pager">
	{#if data.prev}<a href="{base}/escaladors/{data.prev.id}/">← {data.prev.name}</a>{/if}
	{#if data.next} <a href="{base}/escaladors/{data.next.id}/">{data.next.name} →</a>{/if}
</p>
</article>
<style>.pager { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-top: 1.5rem; }</style>
