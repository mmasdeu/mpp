<script lang="ts">
	import type { Intro } from '$lib/data/types';
	let { intro }: { intro: Intro | null } = $props();
	const paras = $derived(intro ? intro.text.split(/\n\n+/) : []);
</script>

{#if intro}
	<section aria-labelledby="h-intro">
		<h2 id="h-intro">Text original del llibre {#if intro.status === 'reviewed'}<span class="badge ok">Text revisat</span>{:else}<span class="badge">Text OCR sense revisar</span>{/if}</h2>
		<blockquote class="original" class:ocr={intro.status !== 'reviewed'} lang="ca">
			{#each paras as p}<p>{p}</p>{/each}
		</blockquote>
		<p class="muted">Pàgin{intro.pages.length > 1 ? 'es' : 'a'} {intro.pages.join(', ')} de <em>Montserrat pam a pam</em> (1977).</p>
	</section>
{/if}
