<script lang="ts">
	import { dataset } from '$lib/data/loader';
	import type { Intro } from '$lib/data/types';
	import { act, editor, needReviewer } from './editor.svelte';
	import PageList from './PageList.svelte';
	/** Editor for a section or a region: introduction text, map pages and (sections) the region they belong to. */
	let { kind, id, name, intro, mapPages, regionId }: { kind: 'section' | 'region'; id: string; name: string; intro: Intro | null; mapPages: number[]; regionId?: string } = $props();
	let text = $state(''), region = $state('');
	$effect(() => { text = intro?.text ?? ''; region = regionId ?? ''; });
	const targets = $derived([...dataset.sections.map((s) => ({ id: s.id, label: `Secció ${s.order}: ${s.name}` })), ...dataset.regions.map((r) => ({ id: r.id, label: `Regió ${r.name}` }))]);
	const saveIntro = () => needReviewer() && act('/intro', { kind, id, text, pages: intro?.pages ?? [] });
</script>

<aside class="needle-editor" aria-label="Editor">
	<h2>Editor · {kind === 'section' ? 'secció' : 'regió'} {name} <code>{id}</code></h2>
	<fieldset disabled={editor.busy}>
		<legend>Text d'introducció</legend>
		<textarea bind:value={text} rows="12" style="width:100%" lang="ca" placeholder="Sense text d'introducció"></textarea>
		<p class="muted">{intro?.status === 'reviewed' ? `Revisat per ${intro.reviewer} (${intro.date}).` : intro ? 'Prefillat amb l\'OCR sense revisar.' : 'Buit.'} Un text buit esborra la revisió.</p>
		<button type="button" onclick={saveIntro}>Desa el text</button>
	</fieldset>
	{#if kind === 'section'}
		<fieldset disabled={editor.busy}>
			<legend>Regió</legend>
			<select bind:value={region}>{#each dataset.regions as r}<option value={r.id}>{r.name}</option>{/each}</select>
			<button type="button" disabled={region === regionId} onclick={() => needReviewer() && act('/structure', { sectionId: id, regionId: region })}>Mou la secció a aquesta regió</button>
		</fieldset>
	{/if}
	<fieldset disabled={editor.busy}>
		<legend>Mapes assignats</legend>
		<PageList pages={mapPages} {targets} label="Plànol"
			onremove={(p) => needReviewer() && act('/map', { page: p, from: id })}
			onmove={(p, to) => needReviewer() && act('/map', { page: p, from: id, to })}
			onadd={(p) => needReviewer() && act('/map', { page: p, to: id })} />
	</fieldset>
	{#if editor.error}<p class="editor-error" role="alert">{editor.error}</p>{/if}
</aside>

<style>
	.needle-editor { border: 2px dashed #c9a227; padding: .5rem 1rem; margin: 1rem 0; background: #fffdf3; }
	fieldset { margin: .75rem 0; border: 1px solid var(--line); } legend { font-weight: 600; }
	.editor-error { color: #8a1c1c; font-weight: 600; }
</style>
