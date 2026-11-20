<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import BookPages from '$lib/components/Book/BookPages.svelte';
	import { buildQueue } from '$lib/review/queue';
	import type { Decision } from '$lib/data/review';
	import { editor, loadEditor, saveEditor } from '$lib/editor/editor.svelte';
	let { data } = $props();

	const KEY = 'pam-review-v1';
	let decisions = $state<Decision[]>([]);
	let reviewer = $state('');
	let skipped = $state<string[]>([]);
	let name = $state(''), alt = $state(''), semir = $state(''), text = $state(''), reason = $state(''), mergeInto = $state('');
	let loaded = $state(false);

	// With `npm run edit` decisions are written to data/review/decisions.json by the editor server; otherwise they stay in this browser.
	const server = __EDITOR__;
	let lastServerId = $state<string | null>(null), error = $state('');
	onMount(() => {
		if (server) { loadEditor(); reviewer = editor.reviewer; try { skipped = JSON.parse(sessionStorage.getItem(KEY + '-skipped') ?? '[]'); lastServerId = sessionStorage.getItem(KEY + '-last'); } catch { /* empty */ } }
		else try { const s = JSON.parse(localStorage.getItem(KEY) ?? '{}'); decisions = s.decisions ?? []; reviewer = s.reviewer ?? ''; } catch { /* empty */ }
		loaded = true;
	});
	$effect(() => { if (loaded && server) { editor.reviewer = reviewer; saveEditor(); try { sessionStorage.setItem(KEY + '-skipped', JSON.stringify(skipped)); } catch { /* ignore */ } } });
	async function post(path: string, body: unknown, method = 'POST', query = ''): Promise<boolean> {
		error = '';
		const r = await fetch(`/__edit${path}${query}`, { method, headers: { 'content-type': 'application/json', 'x-editor': '1' }, body: method === 'POST' ? JSON.stringify(body) : undefined });
		if (!r.ok) { error = (await r.json().catch(() => ({}))).error ?? `Error ${r.status}`; return false; }
		return true;
	}
	$effect(() => { if (loaded && !server) try { localStorage.setItem(KEY, JSON.stringify({ decisions, reviewer })); } catch { /* private mode */ } });

	const done = $derived(new Set(decisions.map((d) => d.needleId)));
	const queue = $derived(buildQueue(data.needles, data.ocr, done).filter((q) => !skipped.includes(q.needle.id)));
	const total = $derived(data.needles.filter((n) => n.metadata.extractionStatus === 'unreviewed').length);
	const cur = $derived(queue[0]);
	$effect(() => {
		if (!cur) return;
		const n = cur.needle;
		name = n.name; alt = n.alternativeNames.join('; '); semir = n.semirRef ?? '';
		text = n.description ?? data.ocr?.[n.id]?.text ?? ''; reason = ''; mergeInto = '';
	});

	const today = () => new Date().toISOString().slice(0, 10);
	async function decide(action: Decision['action']) {
		if (!cur) return;
		const n = cur.needle;
		if (!reviewer.trim()) return alert('Indiqueu el vostre nom (revisor/a).');
		const d: Decision = { needleId: n.id, action, reviewer: reviewer.trim(), date: today() };
		if (action === 'reject' || action === 'merge') {
			if (!reason.trim()) return alert('Cal indicar un motiu.');
			d.reason = reason.trim();
		}
		if (action === 'merge') { if (!mergeInto.trim()) return alert('Indiqueu l\'identificador de l\'agulla destí (p. ex. n0010).'); d.mergeInto = mergeInto.trim(); }
		if (action === 'correct') {
			if (name.trim() !== n.name) d.name = name.trim();
			const a = alt.split(';').map((s) => s.trim()).filter(Boolean);
			if (a.join(';') !== n.alternativeNames.join(';')) d.alternativeNames = a;
			if (semir.trim() !== (n.semirRef ?? '')) d.semirRef = semir.trim();
			if (text.trim() && text.trim() !== (data.ocr?.[n.id]?.text ?? '').trim()) d.description = text.trim();
			if (!(d.name || d.alternativeNames || d.semirRef !== undefined || d.description)) return alert('No hi ha cap canvi: useu «Accepta».');
		}
		if (server) {
			if (!(await post('/decision', d))) return;
			lastServerId = n.id; try { sessionStorage.setItem(KEY + '-last', n.id); } catch { /* ignore */ }
			location.reload();                                        // the page's data comes from the files just written
		} else decisions = [...decisions, d];
	}
	async function undoLast() {
		if (!server) { decisions = decisions.slice(0, -1); return; }
		if (lastServerId && (await post('/decision', null, 'DELETE', `?needleId=${lastServerId}`))) { sessionStorage.removeItem(KEY + '-last'); location.reload(); }
	}
	function exportJson() {
		const blob = new Blob([JSON.stringify(decisions, null, 1) + '\n'], { type: 'application/json' });
		const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `decisions-${today()}.json`; a.click(); URL.revokeObjectURL(a.href);
	}
</script>

<svelte:head><title>Revisió d'agulles — Montserrat Pam a Pam</title></svelte:head>
<h1>Revisió d'agulles</h1>
<p class="muted">Compareu cada fitxa amb la pàgina del llibre. Les agulles més sospitoses van primer.
	{#if server}Les decisions s'escriuen directament a <code>data/review/decisions.json</code> (mode editor).{:else}Les decisions es desen en aquest navegador; exporteu-les i importeu-les amb <code>npm run review -- import-json fitxer.json</code>.{/if}</p>
{#if error}<p role="alert" style="color:#8a1c1c;font-weight:600">{error}</p>{/if}
<p><label>Revisor/a <input bind:value={reviewer} placeholder="Nom" autocomplete="name" /></label>
	{#if !server}<strong>{decisions.length}</strong> decisions · {/if}<strong>{queue.length}</strong> pendents de {total}
	{#if !server}<button type="button" onclick={exportJson} disabled={!decisions.length}>Exporta decisions</button>{/if}
	<button type="button" onclick={undoLast} disabled={server ? !lastServerId : !decisions.length}>Desfés l'última</button></p>

{#if !cur}
	<p>No queden agulles per revisar{skipped.length ? ` (n'heu saltat ${skipped.length})` : ''}.</p>
	{#if skipped.length}<button type="button" onclick={() => (skipped = [])}>Torna a mostrar les saltades</button>{/if}
{:else}
	{@const n = cur.needle}
	<div class="needle-grid">
		<div>
			<h2>{n.id} <small class="muted">· {n.sectionId} · pàg. {n.bookReferences[0]?.page}</small></h2>
			<p class="muted">Motius de prioritat ({cur.score}): {cur.reasons.join(', ') || 'cap'}. <a href="{base}/needles/{n.id}/">Fitxa</a></p>
			<p><label>Nom <input bind:value={name} size="40" /></label></p>
			<p><label>Noms alternatius (separats per «;») <input bind:value={alt} size="40" /></label></p>
			<p><label>Número de Semir <input bind:value={semir} size="6" /></label></p>
			<p><label>Text (transcripció revisada) <textarea bind:value={text} rows="14" style="width:100%"></textarea></label></p>
			<p><label>Motiu (rebuig / fusió) <input bind:value={reason} size="40" /></label>
				<label>Fusiona amb <input bind:value={mergeInto} size="7" placeholder="n0010" /></label></p>
			<p>
				<button type="button" onclick={() => decide('accept')}>Accepta tal com està</button>
				<button type="button" onclick={() => decide('correct')}>Desa la correcció</button>
				<button type="button" onclick={() => decide('reject')}>Rebutja</button>
				<button type="button" onclick={() => decide('merge')}>Fusiona</button>
				<button type="button" onclick={() => (skipped = [...skipped, n.id])}>Salta</button>
			</p>
		</div>
		<div class="needle-pages"><BookPages needle={n} scans /></div>
	</div>
{/if}
