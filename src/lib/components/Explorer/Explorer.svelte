<script lang="ts">
	import { needlesGeoJSON as geo_fc } from '$lib/geography/needles-fc';
	import { base } from '$app/paths';
	import { KIND_LABEL } from '$lib/data/kinds';
	import { onMount, tick } from 'svelte';
	import Map from '$lib/components/Map/Map.svelte';
	import type { BasemapId } from '$lib/components/Map/config';
	import Icon from '$lib/ui/Icon.svelte';
	import { regionColor } from '$lib/ui/regions';
	import { dataset, getNeedle, getSection } from '$lib/data/loader';
	import { searchNeedles } from '$lib/search/search';
	import drawingsByNeedle from '../../../../data/drawings.json';
	import { editor, act, needReviewer } from '$lib/editor/editor.svelte';

	type Sheet = 'peek' | 'half' | 'full';
	let region = $state('');
	let section = $state('');
	let q = $state('');
	let geo = $state<'all' | 'yes' | 'no'>('all');
	let kind = $state<'all' | 'needle' | 'cova' | 'avenc' | 'itinerari'>('all');   // needles/rocks, caves, pits, routes
	let selected = $state<string | null>(null);
	let basemapId = $state<BasemapId>('topo');
	let terrain = $state(false);
	let loaded = $state(false);
	let sheet = $state<Sheet>('half');
	let panelH = $state(0);
	let winW = $state(1200);
	let body: HTMLDivElement | undefined = $state();
	// editor: place / move the selected needle by clicking the map
	let placing = $state(false);
	let pin = $state<[number, number] | null>(null);
	let acc = $state<'approximate' | 'verified'>('approximate');
	let placeRequested = $state(false);
	const canEdit = $derived(__EDITOR__ && editor.on);
	function startPlacing() {
		if (!sel) return;
		placing = true; acc = sel.location?.accuracy === 'verified' ? 'verified' : 'approximate';
		pin = sel.location ? [sel.location.longitude, sel.location.latitude] : null;
		if (mobile) sheet = 'peek';
	}
	const stopPlacing = () => { placing = false; pin = null; sugNote = ''; };
	async function savePin() {
		if (!sel || !pin || !needReviewer()) return;
		await act('/location', { needleId: sel.id, latitude: pin[1], longitude: pin[0], accuracy: acc, ...(sugNote ? { note: sugNote } : {}) });   // reloads on success
	}
	$effect(() => { if (placeRequested && canEdit && sel) { placeRequested = false; startPlacing(); } });

	// editor: location candidates that scripts/geolocate.py could not decide on (data/source/geolocation/geolocate-review.json)
	type Sug = { place: string; source: string; ref: string; latitude: number; longitude: number; match: string; distance_m: number | ''; reason: string };
	const sugFiles = import.meta.glob('../../../../data/source/geolocation/geolocate-review.json', { import: 'default' });
	let suggestions = $state<Record<string, Sug[]>>({});
	$effect(() => { if (canEdit) Object.values(sugFiles)[0]?.().then((d) => (suggestions = d as Record<string, Sug[]>)); });
	let sugNote = '';
	function trySuggestion(g: Sug) {
		if (!sel) return;
		startPlacing();
		pin = [g.longitude, g.latitude];
		sugNote = `Suggeriment acceptat: ${g.place} (${g.source === 'icgc' ? 'ICGC toponímia 1:5.000' : `OSM ${g.ref}`}; ${g.match})`;
	}
	$effect(() => { if (placing && (!sel || !canEdit)) stopPlacing(); });
	const mobile = $derived(winW < 52 * 16);

	onMount(() => {
		const p = new URLSearchParams(location.search);
		selected = p.get('needle');
		const n = selected ? getNeedle(selected) : null;
		section = n?.sectionId ?? p.get('section') ?? '';
		region = n?.regionId ?? p.get('region') ?? (section ? getSection(section)?.regionId ?? '' : '');
		q = p.get('q') ?? '';
		geo = (p.get('geo') as typeof geo) ?? 'all';
		kind = (p.get('kind') as typeof kind) ?? 'all';
		basemapId = (p.get('base') as BasemapId) ?? 'topo';
		placeRequested = p.get('place') === '1';
		terrain = p.get('3d') === '1';
		if (n) sheet = 'half';
		else if (window.innerWidth < 52 * 16 && !(q || section || region)) sheet = 'peek';
		loaded = true;
	});
	$effect(() => {
		if (!loaded) return;
		const p = new URLSearchParams();
		if (selected) p.set('needle', selected);
		if (region) p.set('region', region);
		if (section) p.set('section', section);
		if (q) p.set('q', q);
		if (geo !== 'all') p.set('geo', geo);
		if (kind !== 'all') p.set('kind', kind);
		if (basemapId !== 'topo') p.set('base', basemapId);
		if (terrain) p.set('3d', '1');
		history.replaceState(history.state, '', `${location.pathname}${p.size ? '?' + p : ''}`);
	});

	const sections = $derived(dataset.sections.filter((s) => !region || s.regionId === region));
	const filtered = $derived.by(() => {
		const ns = q ? searchNeedles(dataset.needles, q) : dataset.needles;
		return ns.filter((n) => (!region || n.regionId === region) && (!section || n.sectionId === section) && (geo === 'all' || (geo === 'yes') === !!n.location) && (kind === 'all' || (kind === 'needle' ? !n.kind : n.kind === kind)));
	});
	const located = $derived(filtered.filter((n) => n.location).length);
	const active = $derived(!!(region || section || q || geo !== 'all' || kind !== 'all'));
	const visibleIds = $derived(active ? filtered.map((n) => n.id) : null);
	const sel = $derived(selected ? getNeedle(selected) ?? null : null);
	const selSug = $derived(sel && !sel.location ? suggestions[sel.id] ?? [] : []);
	const selSection = $derived(sel ? getSection(sel.sectionId) : null);
	const selRegion = $derived(sel ? dataset.regions.find((r) => r.id === sel.regionId) : null);
	const selDrawing = $derived(sel ? ((drawingsByNeedle as Record<string, number[]>)[sel.id] ?? [])[0] : undefined);
	// what the map should frame: the section of an unlocated selected needle, else the region/section filter (search alone doesn't move the map)
	const focusIds = $derived.by(() => {
		if (sel && !sel.location) return dataset.needles.filter((n) => n.sectionId === sel.sectionId && n.location).map((n) => n.id);
		if (region || section) return dataset.needles.filter((n) => n.location && (!region || n.regionId === region) && (!section || n.sectionId === section)).map((n) => n.id);
		return null;
	});
	const padding = $derived(mobile
		? { top: 60, right: 60, bottom: Math.min(panelH, sheet === 'full' ? 120 : panelH) + 30, left: 30 }
		: { top: 60, right: 70, bottom: 60, left: 24 * 16 + 60 });

	const reset = () => { region = ''; section = ''; q = ''; geo = 'all'; kind = 'all'; selected = null; };
	$effect(() => { if (section && !sections.some((s) => s.id === section)) section = ''; });

	async function pick(id: string | null, from: 'map' | 'list') {
		selected = id;
		if (!id) { if (mobile && from === 'map') sheet = 'peek'; return; }
		if (mobile) sheet = 'half';
		await tick();
		body?.scrollTo({ top: 0, behavior: 'smooth' });
	}
	const toggleRegion = (id: string) => { region = region === id ? '' : id; section = ''; };
	const cycle = () => (sheet = sheet === 'peek' ? 'half' : sheet === 'half' ? 'full' : 'peek');

	// drag the bottom sheet by its handle (mobile)
	let dragY: number | null = null;
	let dragStartH = 0;
	let dragH = $state<number | null>(null);
	function down(e: PointerEvent) { dragY = e.clientY; dragStartH = panelH; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
	function move(e: PointerEvent) { if (dragY !== null) dragH = Math.max(96, dragStartH + (dragY - e.clientY)); }
	function up(e: PointerEvent) {
		if (dragY === null) return;
		const moved = Math.abs(e.clientY - dragY);
		dragY = null;
		if (moved < 6) { dragH = null; cycle(); return; }
		const parent = (e.currentTarget as HTMLElement).closest('.explorer') as HTMLElement;
		const r = (dragH ?? panelH) / parent.clientHeight;
		sheet = r < 0.3 ? 'peek' : r < 0.72 ? 'half' : 'full';
		dragH = null;
	}
	const pageOf = (id: string) => getNeedle(id)?.bookReferences[0]?.page;
</script>

<svelte:window bind:innerWidth={winW} onkeydown={(e) => e.key === 'Escape' && placing && stopPlacing()} />

<div class="explorer">
	<div class="map-area">
		<Map data={geo_fc} {visibleIds} {selected} {focusIds} {padding} bind:basemapId bind:terrain
			onselect={(id) => pick(id, 'map')} {placing} bind:pin />
	</div>

	{#if placing && sel}
		<div class="placebar card" role="region" aria-label="Situa l'agulla al mapa">
			<p><strong>{sel.name}</strong>: {pin ? 'arrossegueu el marcador per afinar-lo, o feu clic en un altre punt.' : 'feu clic al mapa on és l\'agulla.'}</p>
			{#if pin}
				<p class="muted coords">{pin[1].toFixed(6)}, {pin[0].toFixed(6)}</p>
				<label>Precisió <select bind:value={acc}><option value="approximate">aproximada</option><option value="verified">verificada</option></select></label>
			{/if}
			<div class="pb-actions">
				<button type="button" class="primary small" onclick={savePin} disabled={!pin || editor.busy}>Desa la ubicació</button>
				<button type="button" class="small" onclick={stopPlacing}>Cancel·la</button>
			</div>
			{#if editor.error}<p class="err" role="alert">{editor.error}</p>{/if}
		</div>
	{/if}

	<aside class="panel {sheet}" class:dragging={dragH !== null} style={dragH !== null ? `height:${dragH}px` : undefined} bind:clientHeight={panelH} aria-label="Agulles i filtres">
		<button type="button" class="handle" aria-label={sheet === 'full' ? 'Redueix el panell' : 'Amplia el panell'} onpointerdown={down} onpointermove={move} onpointerup={up}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), cycle())}><span></span></button>
		<div class="head">
			<div class="searchbox">
				<Icon name="search" size={18} />
				<label class="sr-only" for="q">Cerca</label>
				<input id="q" type="search" bind:value={q} placeholder="Cerca una agulla, variant o número…" autocomplete="off" onfocus={() => mobile && sheet === 'peek' && (sheet = 'half')} />
			</div>
			<div class="chips regions" role="group" aria-label="Regió">
				{#each dataset.regions as r (r.id)}
					<button type="button" class="chip" aria-pressed={region === r.id} onclick={() => toggleRegion(r.id)}><span class="dot" style="--c:{regionColor(r.id)}"></span>{r.name}</button>
				{/each}
			</div>
		</div>

		<div class="body" bind:this={body}>
			{#if sel}
				<article class="preview card" aria-labelledby="sel-name">
					<button type="button" class="ghost close" onclick={() => (selected = null)} aria-label="Tanca la fitxa"><Icon name="close" size={18} /></button>
					<p class="eyebrow"><span class="dot" style="--c:{regionColor(sel.regionId)}"></span> {selRegion?.name} · Secció {selSection?.order}</p>
					<h2 id="sel-name">{sel.name}</h2>
					<p class="meta">
						{#if sel.metadata.extractionStatus === 'unreviewed'}<span class="badge">Sense revisar</span>{:else}<span class="badge ok">{sel.metadata.extractionStatus === 'verified' ? 'Verificada' : 'Revisada'}</span>{/if}
						{#if sel.semirRef}<span class="badge neutral">Semir {sel.semirRef}</span>{/if}
						<span class="badge neutral">p. {sel.bookReferences[0]?.page}</span>
					</p>
					{#if sel.alternativeNames.length}<p class="muted">També: {sel.alternativeNames.join(', ')}</p>{/if}
					{#if !sel.location}<p class="muted"><Icon name="pin-off" size={15} /> Sense coordenades: el mapa mostra la secció {selSection?.name}.</p>{/if}
					{#if selDrawing && __DRAWINGS__}
						<a href="{base}/needles/{sel.id}/" aria-label="Obre la fitxa de {sel.name}"><img class="thumb ink" src="{base}/images/drawings/d{String(selDrawing).padStart(3, '0')}.webp" alt="Dibuix de {sel.name} (pàgina {selDrawing})" loading="lazy" onerror={(e) => ((e.currentTarget as HTMLElement).style.display = 'none')} /></a>
					{/if}
					<p class="actions"><a class="btn primary" href="{base}/needles/{sel.id}/">Obre la fitxa <Icon name="arrow-right" size={16} /></a>
						<a class="btn" href="{base}/sections/{sel.sectionId}/">Secció</a></p>
					{#if canEdit}
						<p class="actions edit">
							<button type="button" class="small" onclick={startPlacing} disabled={placing}><Icon name="pin" size={15} /> {sel.location ? 'Mou-la al mapa' : 'Situa-la al mapa'}</button>
							{#if sel.location}<button type="button" class="small ghost" onclick={() => act('/location', {}, 'DELETE', `?needleId=${sel.id}`)}>Treu-la del mapa</button>{/if}
						</p>
						{#if sel.location?.source}<p class="muted src">Font: {sel.location.source}</p>{/if}
						{#if selSug.length}
							<div class="sugs">
								<p class="eyebrow">Llocs possibles (a revisar)</p>
								<ul>
									{#each selSug as g (g.ref + g.place + g.latitude)}
										<li><button type="button" class="small ghost" onclick={() => trySuggestion(g)} title="Situa-la aquí (es pot ajustar abans de desar)">
											<Icon name="pin" size={14} /> <span><strong>{g.place}</strong> <small>{g.source === 'icgc' ? 'ICGC' : 'OSM'} · {g.match}{g.distance_m !== '' ? ` · a ${g.distance_m} m de les agulles veïnes` : ''}{g.reason !== g.match ? ` · ${g.reason}` : ''}</small></span></button></li>
									{/each}
								</ul>
							</div>
						{/if}
					{/if}
				</article>
			{/if}

			<details class="more-filters" open={!!(section || geo !== 'all' || kind !== 'all') || undefined}>
				<summary>Més filtres</summary>
				<form class="filters" onsubmit={(e) => e.preventDefault()} aria-label="Filtres del mapa">
					<label>Secció<select bind:value={section}><option value="">Totes</option>{#each sections as s}<option value={s.id}>{s.order}. {s.name}</option>{/each}</select></label>
					<label>Geolocalització<select bind:value={geo}><option value="all">Totes</option><option value="yes">Geolocalitzades</option><option value="no">Sense coordenades</option></select></label>
					<label>Tipus<select bind:value={kind}><option value="all">Tots</option><option value="needle">Agulles i roques</option><option value="cova">Coves</option><option value="avenc">Avencs</option><option value="itinerari">Itineraris</option></select></label>
				</form>
			</details>

			<div class="list-head">
				<h2 id="h-list" aria-live="polite">{filtered.length} agulles</h2>
				<span class="muted">{located} al mapa</span>
				{#if active || selected}<button type="button" class="small" onclick={reset}>Esborra els filtres</button>{/if}
			</div>
			{#if active}
				<div class="chips" aria-label="Filtres actius">
					{#if region}<span class="badge neutral">Regió: {dataset.regions.find((r) => r.id === region)?.name}</span>{/if}
					{#if section}<span class="badge neutral">Secció: {getSection(section)?.name}</span>{/if}
					{#if q}<span class="badge neutral">Cerca: {q}</span>{/if}
					{#if geo !== 'all'}<span class="badge neutral">{geo === 'yes' ? 'Geolocalitzades' : 'Sense coordenades'}</span>{/if}
					{#if kind !== 'all'}<span class="badge neutral">{kind === 'needle' ? 'Agulles i roques' : kind === 'cova' ? 'Coves' : kind === 'avenc' ? 'Avencs' : 'Itineraris'}</span>{/if}
				</div>
			{/if}
			<ul class="results" aria-labelledby="h-list">
				{#each filtered as n (n.id)}
					<li class:sel={n.id === selected}>
						<button type="button" class="row" onclick={() => pick(n.id, 'list')} aria-current={n.id === selected || undefined}>
							<span class="dot" style="--c:{regionColor(n.regionId)}"></span>
							<span class="nm">{n.name}<small>{n.kind ? `${KIND_LABEL[n.kind]} · ` : ''}{getSection(n.sectionId)?.name} · p. {pageOf(n.id)}</small></span>
							{#if !n.location}<span class="nl" title="Sense coordenades"><Icon name="pin-off" size={16} label="sense coordenades" /></span>{/if}
						</button>
						<a class="go" href="{base}/needles/{n.id}/" aria-label="Fitxa de {n.name}"><Icon name="arrow-right" size={16} /></a>
					</li>
				{/each}
			</ul>
			{#if !filtered.length}<p class="muted empty">Cap agulla amb aquests filtres.</p>{/if}
		</div>
	</aside>
</div>

<style>
	.explorer { position: absolute; inset: 0; overflow: hidden; }
	.map-area { position: absolute; inset: 0; }
	.panel { position: absolute; z-index: 5; display: flex; flex-direction: column; background: var(--surface); color: var(--fg); box-shadow: var(--shadow-3); overflow: hidden; }
	.handle { display: none; }
	.head { padding: .9rem .9rem .4rem; border-bottom: 1px solid var(--line); display: grid; gap: .6rem; }
	.searchbox { position: relative; display: flex; align-items: center; color: var(--muted); }
	.searchbox :global(svg) { position: absolute; left: .85rem; pointer-events: none; }
	.searchbox input { width: 100%; padding-left: 2.5rem; background: var(--surface-2); border-color: transparent; min-height: 2.75rem; }
	.regions { margin: 0; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding-bottom: .35rem; }
	.regions .chip { flex: none; }
	.body { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: .5rem .9rem 1rem; scrollbar-width: thin; }

	.preview { position: relative; padding: 1rem 1.1rem; margin: .4rem 0 .75rem; border-color: color-mix(in srgb, var(--accent) 30%, var(--line)); }
	.preview h2 { margin: .2rem 2rem .4rem 0; font-size: 1.4rem; }
	.preview .eyebrow { display: flex; align-items: center; gap: .45rem; margin: 0; }
	.preview .meta { display: flex; flex-wrap: wrap; gap: .35rem; margin: 0 0 .5rem; }
	.preview .close { position: absolute; top: .5rem; right: .5rem; width: 2.25rem; height: 2.25rem; min-height: 0; padding: 0; }
	.preview .thumb { max-height: 13rem; width: auto; margin: .5rem auto; }
	.preview .actions { display: flex; gap: .5rem; flex-wrap: wrap; margin: .75rem 0 0; }
	.preview .muted :global(svg) { vertical-align: -3px; }

	.more-filters summary { cursor: pointer; color: var(--muted); font-size: .875rem; padding: .35rem 0; }
	.more-filters .filters { margin: .25rem 0 .5rem; grid-template-columns: 1fr 1fr; }
	.list-head { display: flex; align-items: baseline; gap: .6rem; flex-wrap: wrap; margin: .5rem 0 .4rem; }
	.list-head h2 { margin: 0; font-size: 1.1rem; font-family: var(--font-ui); font-weight: 700; }
	.list-head button { margin-left: auto; }
	.results { list-style: none; margin: 0; padding: 0; }
	.results li { display: flex; align-items: stretch; border-radius: var(--radius-s); }
	.results li:hover, .results li.sel { background: var(--surface-2); }
	.row { flex: 1; min-width: 0; justify-content: flex-start; text-align: left; gap: .7rem; min-height: 3rem; padding: .35rem .5rem; border: 0; border-radius: var(--radius-s); background: none; font-weight: 600; }
	.row .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
	.row small { display: block; font-weight: 400; color: var(--muted); font-size: .8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.nl { color: var(--muted); display: grid; place-items: center; }
	.go { display: grid; place-items: center; width: 2.5rem; color: var(--muted); border-radius: var(--radius-s); }
	.go:hover { color: var(--accent); }
	.empty { padding: 1rem 0; }
	.actions.edit { border-top: 1px dashed var(--line); padding-top: .6rem; }
	.src { font-size: .8rem; margin: .35rem 0 0; }
	.sugs { margin-top: .6rem; }
	.sugs ul { list-style: none; margin: .25rem 0 0; padding: 0; display: grid; gap: .2rem; }
	.sugs button { width: 100%; justify-content: flex-start; text-align: left; height: auto; min-height: 2.2rem; padding: .3rem .5rem; border-radius: var(--radius-s); white-space: normal; }
	.sugs button:hover { background: var(--surface-2); }
	.sugs small { display: block; color: var(--muted); font-weight: 400; }
	.placebar { position: absolute; z-index: 6; top: .75rem; left: 50%; transform: translateX(-50%); width: min(26rem, calc(100% - 1.5rem)); padding: .75rem 1rem; display: grid; gap: .4rem; box-shadow: var(--shadow-3); border-color: #d97706; }
	.placebar p { margin: 0; }
	.placebar .coords { font-family: var(--font-mono); font-size: .8rem; }
	.placebar label { display: flex; gap: .5rem; align-items: center; font-size: .9rem; }
	.placebar select { min-height: 2rem; padding: .2rem .5rem; }
	.pb-actions { display: flex; gap: .5rem; }
	.placebar .err { color: var(--danger); font-size: .85rem; }
	@media (min-width: 52rem) { .placebar { left: calc(25.5rem + (100% - 25.5rem) / 2); } }

	/* desktop: floating side panel */
	@media (min-width: 52rem) {
		.panel { top: .75rem; left: .75rem; bottom: .75rem; width: 24rem; border-radius: var(--radius-l); border: 1px solid var(--line); }
		.regions { flex-wrap: wrap; overflow: visible; }
	}
	/* mobile: bottom sheet with three snap heights */
	@media (max-width: 51.99rem) {
		.panel { left: 0; right: 0; bottom: 0; border-radius: var(--radius-l) var(--radius-l) 0 0; transition: height .28s var(--ease); height: 46%; }
		.panel.peek { height: 8.6rem; }
		.panel.full { height: calc(100% - 2.5rem); }
		.panel.dragging { transition: none; }
		.handle { display: grid; place-items: center; width: 100%; height: 1.5rem; min-height: 0; padding: 0; border: 0; border-radius: 0; background: none; cursor: grab; touch-action: none; }
		.handle span { width: 2.75rem; height: .3rem; border-radius: 999px; background: var(--line); }
		.head { padding-top: 0; }
		.peek .body { visibility: hidden; }
	}
</style>
