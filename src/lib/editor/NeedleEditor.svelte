<script lang="ts">
	import { base } from '$app/paths';
	import { dataset } from '$lib/data/loader';
	import type { Needle, OcrText } from '$lib/data/types';
	import type { TextPart } from '../../routes/needles/[id]/+page';
	import { act, editor, needReviewer } from './editor.svelte';
	import PageList from './PageList.svelte';
	let { needle, ocr, drawings, parts = [] }: { needle: Needle; ocr: OcrText | null; drawings: number[]; parts?: TextPart[] } = $props();
	// a merged needle: the text box starts with all the texts joined in book order, and saving it marks it as covering them
	const startText = $derived(parts.length ? parts.map((p) => p.description ?? p.ocr?.text ?? '').filter(Boolean).join('\n\n') : (needle.description ?? ocr?.text ?? ''));
	const targets = $derived(dataset.needles.map((n) => ({ id: n.id, label: n.name })));

	let name = $state(''), alt = $state(''), semir = $state(''), pages = $state(''), text = $state('');
	let lat = $state(''), lon = $state(''), ele = $state(''), acc = $state<'verified' | 'approximate' | 'unknown'>('approximate');
	let reason = $state(''), mergeInto = $state('');
	$effect(() => {
		name = needle.name; alt = needle.alternativeNames.join('; '); semir = needle.semirRef ?? '';
		pages = needle.bookReferences.map((b) => b.page).join(', ');
		text = startText;
		lat = needle.location ? String(needle.location.latitude) : ''; lon = needle.location ? String(needle.location.longitude) : '';
		ele = needle.location?.elevation ? String(needle.location.elevation) : ''; acc = needle.location?.accuracy ?? 'approximate';
		reason = ''; mergeInto = '';
	});

	const decide = (action: string, extra: Record<string, unknown> = {}) => needReviewer() && act('/decision', { needleId: needle.id, action, ...extra });
	function correct() {
		const body: Record<string, unknown> = {};
		if (name.trim() !== needle.name) body.name = name.trim();
		const a = alt.split(';').map((s) => s.trim()).filter(Boolean);
		if (a.join(';') !== needle.alternativeNames.join(';')) body.alternativeNames = a;
		if (semir.trim() !== (needle.semirRef ?? '')) body.semirRef = semir.trim();
		const ps = pages.split(/[ ,;]+/).filter(Boolean).map(Number);
		if (ps.join(',') !== needle.bookReferences.map((b) => b.page).join(',')) body.pages = ps;
		if (text.trim() && (text.trim() !== startText.trim() || parts.length)) { body.description = text.trim(); if (parts.length) body.mergedText = true; }
		if (!Object.keys(body).length) { editor.error = 'No hi ha cap canvi per desar.'; return; }
		decide('correct', body);
	}
	const saveLocation = () => needReviewer() && act('/location', { needleId: needle.id, latitude: Number(lat), longitude: Number(lon), ...(ele ? { elevation: Number(ele) } : {}), accuracy: acc });
	const status = $derived(needle.metadata.extractionStatus);
</script>

<aside class="needle-editor" aria-label="Editor de la fitxa">
	<h2>Editor · <code>{needle.id}</code> <span class="badge">{status === 'unreviewed' ? 'sense revisar' : status === 'verified' ? 'verificada' : 'revisada'}</span></h2>
	<fieldset disabled={editor.busy}>
		<legend>Dades</legend>
		<p><label>Nom <input bind:value={name} size="40" /></label></p>
		<p><label>Noms alternatius (separats per «;») <input bind:value={alt} size="40" /></label></p>
		<p><label>Número de Semir <input bind:value={semir} size="8" /></label>
			<label>Pàgines del llibre <input bind:value={pages} size="14" placeholder="100, 101" /></label></p>
		<p><label>Text original (transcripció revisada)<br /><textarea bind:value={text} rows="14" style="width:100%" lang="ca"></textarea></label></p>
		<p class="muted">{parts.length ? 'Inclou el text de les entrades fusionades, en ordre del llibre: en desar-lo, aquest text les substitueix totes.' : needle.description ? 'Text ja revisat.' : ocr ? 'Prefillat amb l\'OCR sense revisar: corregiu-lo comparant-lo amb la pàgina.' : 'Sense OCR disponible.'}</p>
		<button type="button" onclick={correct}>Desa la correcció</button>
	</fieldset>

	<fieldset disabled={editor.busy}>
		<legend>Estat</legend>
		<button type="button" onclick={() => decide('accept')} disabled={status !== 'unreviewed'}>Marca com a revisada</button>
		<button type="button" onclick={() => decide('verify')} disabled={status === 'verified'}>Marca com a verificada</button>
		<button type="button" onclick={() => act('/decision', {}, 'DELETE', `?needleId=${needle.id}`)} disabled={status === 'unreviewed'}>Desfés la decisió</button>
		<p><label>Motiu <input bind:value={reason} size="30" /></label>
			<button type="button" onclick={() => reason.trim() ? decide('reject', { reason: reason.trim() }) : (editor.error = 'Cal un motiu.')}>Rebutja (no és una agulla)</button></p>
		<p><label>Fusiona amb <input list="needle-targets" bind:value={mergeInto} size="22" placeholder="id o nom" /></label>
			<button type="button" onclick={() => reason.trim() && mergeInto ? decide('merge', { mergeInto: mergeInto.split(' ')[0], reason: reason.trim() }) : (editor.error = 'Cal el motiu i l\'agulla destí.')}>Fusiona</button></p>
		<datalist id="needle-targets">{#each targets as t}<option value="{t.id} — {t.label}"></option>{/each}</datalist>
	</fieldset>

	<fieldset disabled={editor.busy}>
		<legend>Localització</legend>
		<p><label>Latitud <input bind:value={lat} size="11" /></label> <label>Longitud <input bind:value={lon} size="11" /></label>
			<label>Alçada (m) <input bind:value={ele} size="6" /></label>
			<label>Precisió <select bind:value={acc}><option value="verified">verificada</option><option value="approximate">aproximada</option><option value="unknown">desconeguda</option></select></label></p>
		<button type="button" onclick={saveLocation} disabled={!lat || !lon}>Desa la localització</button>
		{#if needle.location}<button type="button" onclick={() => act('/location', {}, 'DELETE', `?needleId=${needle.id}`)}>Treu la localització</button>{/if}
		<a class="btn" href="{base}/map/?needle={needle.id}&place=1">{needle.location ? 'Mou-la al mapa' : 'Situa-la al mapa'}</a>
	</fieldset>

	<fieldset disabled={editor.busy}>
		<legend>Dibuixos assignats a aquesta agulla</legend>
		<PageList pages={drawings} {targets} label="Dibuix"
			onremove={(p) => needReviewer() && act('/drawing', { page: p, from: needle.id })}
			onmove={(p, to) => needReviewer() && act('/drawing', { page: p, from: needle.id, to })}
			onadd={(p) => needReviewer() && act('/drawing', { page: p, to: needle.id })} />
	</fieldset>
	{#if editor.error}<p class="editor-error" role="alert">{editor.error}</p>{/if}
</aside>

<style>
	.needle-editor { border: 2px dashed #c9a227; padding: .5rem 1rem; margin: 1rem 0; background: #fffdf3; }
	fieldset { margin: .75rem 0; border: 1px solid var(--line); } legend { font-weight: 600; }
	.editor-error { color: #8a1c1c; font-weight: 600; }
</style>
