<script lang="ts">
	import { base } from '$app/paths';
	import { panoramas, observations } from '$lib/data/loader';
</script>

<svelte:head><title>Panorames · Montserrat Pam a Pam</title></svelte:head>
<h1>Panorames anotats</h1>
{#if panoramas.length === 0}
	<p>Encara no hi ha panorames publicats. Cada panoràmic necessita autoria, font i llicència documentades abans de ser inclòs.</p>
{:else}
	<ul class="plain">
		{#each panoramas as p (p.id)}
			<li><a href="{base}/panoramas/{p.id}/">{p.title}</a>
				<span class="muted">· {p.annotations.length} agulles{p.observationPointId ? ` · des de ${observations.find((o) => o.id === p.observationPointId)?.name}` : ''}</span>
				{#if p.status === 'unreviewed'}<span class="badge">anotacions sense revisar</span>{/if}</li>
		{/each}
	</ul>
{/if}
