<script lang="ts">
	import '../app.css';
	import '$lib/ui/themes.css';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { net } from '$lib/pwa/offline.svelte';
	import EditorBar from '$lib/editor/EditorBar.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import ThemePicker from '$lib/ui/ThemePicker.svelte';
	let { children } = $props();

	const path = $derived(page.url.pathname.slice(base.length) || '/');
	// map-first pages fill the viewport (no footer, no page scroll)
	const full = $derived(path === '/map/' || path === '/vista/');
	const is = (p: string) => (p === '/' ? path === '/' : path.startsWith(p));
	const extraActive = $derived(['/escaladors/', '/revisio/', '/llibre/', '/offline/'].some(is));
	let moreOpen = $state(false);
	$effect(() => { path; moreOpen = false; });
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (moreOpen = false)} />

<div class="app" class:full>
	{#if __EDITOR__}<EditorBar />{/if}
	<header class="top">
		<a class="brand" href="{base}/" aria-label="Montserrat Pam a Pam — inici">
			<span class="logo" aria-hidden="true"><Icon name="mountain" size={18} /></span>
			<span class="brand-text">Montserrat <em>Pam a Pam</em></span>
		</a>
		<nav class="desk" aria-label="Navegació principal">
			<a href="{base}/" aria-current={is('/') || is('/regions/') || is('/sections/') || is('/needles/') ? 'page' : undefined}>Inici</a>
			<a href="{base}/map/" aria-current={is('/map/') ? 'page' : undefined}>Mapa</a>
			<a href="{base}/a-prop/" aria-current={is('/a-prop/') ? 'page' : undefined}>A prop</a>
			<a href="{base}/escaladors/" aria-current={is('/escaladors/') ? 'page' : undefined}>Escaladors</a>
			<a href="{base}/search/" aria-current={is('/search/') ? 'page' : undefined}>Cerca</a>
			<a href="{base}/revisio/" aria-current={is('/revisio/') ? 'page' : undefined}>Revisió</a>
			<a href="{base}/llibre/" aria-current={is('/llibre/') ? 'page' : undefined}>Llibre</a>
		</nav>
		<div class="desk-theme"><ThemePicker id="theme-desk" /></div>
		<a class="icon-btn mob" href="{base}/search/" aria-label="Cerca"><Icon name="search" /></a>
	</header>
	{#if !net.online}
		<div class="offline-banner" role="status"><Icon name="wifi-off" size={16} /> Sense connexió: es mostra el contingut desat; el mapa de fons no està disponible. <a href="{base}/offline/">Més informació</a></div>
	{/if}
	<main>{@render children()}</main>
	{#if !full}
		<footer class="foot">
			<p>Edició digital de <em>Montserrat pam a pam</em>, de Josep Barberà i Sauqué (Publicacions de l'Abadia de Montserrat, 1977).</p>
			<p><strong>Dades en revisió:</strong> les fitxes provenen d'una extracció automàtica i no estan verificades. · <a href="{base}/offline/">Ús sense connexió</a></p>
		</footer>
	{/if}
	<nav class="tabbar" aria-label="Navegació">
		<a href="{base}/" aria-current={is('/') || is('/regions/') || is('/sections/') || is('/needles/') ? 'page' : undefined}><Icon name="mountain" /><span>Inici</span></a>
		<a href="{base}/map/" aria-current={is('/map/') ? 'page' : undefined}><Icon name="map" /><span>Mapa</span></a>
		<a href="{base}/a-prop/" aria-current={is('/a-prop/') ? 'page' : undefined}><Icon name="locate" /><span>A prop</span></a>
		<a href="{base}/search/" aria-current={is('/search/') ? 'page' : undefined}><Icon name="search" /><span>Cerca</span></a>
		<button type="button" class:current={extraActive} aria-expanded={moreOpen} aria-controls="more-menu" onclick={() => (moreOpen = !moreOpen)}><Icon name="more" /><span>Més</span></button>
	</nav>
	{#if moreOpen}
		<button class="scrim" type="button" aria-label="Tanca el menú" onclick={() => (moreOpen = false)}></button>
		<nav id="more-menu" class="more-menu" aria-label="Més seccions">
			<a href="{base}/escaladors/"><Icon name="mountain" /> Escaladors</a>
			<a href="{base}/revisio/"><Icon name="check" /> Revisió de fitxes</a>
			<a href="{base}/llibre/"><Icon name="book" /> El llibre</a>
			<a href="{base}/offline/"><Icon name="wifi-off" /> Ús sense connexió</a>
			<div class="menu-theme"><ThemePicker id="theme-mob" /></div>
		</nav>
	{/if}
</div>

<style>
	.top { position: sticky; top: 0; z-index: 20; height: var(--header-h); display: flex; align-items: center; gap: 1rem; padding: 0 1rem;
		background: color-mix(in srgb, var(--surface) 86%, transparent); backdrop-filter: saturate(1.4) blur(12px); -webkit-backdrop-filter: saturate(1.4) blur(12px); border-bottom: 1px solid var(--line); }
	.brand { display: inline-flex; align-items: center; gap: .55rem; color: var(--fg); text-decoration: none; font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; white-space: nowrap; }
	.brand em { color: var(--accent); font-style: italic; font-weight: 600; }
	.logo { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: .6rem; background: var(--accent); color: var(--on-accent); }
	.desk { margin-left: auto; display: flex; gap: .1rem; min-width: 0; overflow-x: auto; scrollbar-width: none; }
	.desk a { color: var(--muted); text-decoration: none; padding: .45rem .6rem; white-space: nowrap; border-radius: 999px; font-size: .925rem; font-weight: 500; }
	.desk a:hover { color: var(--fg); background: var(--surface-2); }
	.desk a[aria-current='page'] { color: var(--fg); background: var(--surface-2); font-weight: 600; }
	.icon-btn { margin-left: auto; display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 50%; color: var(--fg); }
	.icon-btn:hover { background: var(--surface-2); }
	.foot { max-width: var(--content-w); width: 100%; margin: 0 auto; padding: 1.5rem 1rem 2rem; border-top: 1px solid var(--line); color: var(--muted); font-size: .85rem; }
	.foot p { margin: .25rem 0; }
	.offline-banner { display: flex; gap: .5rem; align-items: center; justify-content: center; flex-wrap: wrap; }

	.tabbar { display: none; }
	.scrim { position: fixed; inset: 0; z-index: 40; background: rgb(0 0 0 / .25); border: 0; border-radius: 0; padding: 0; }
	.more-menu { position: fixed; z-index: 41; right: .75rem; bottom: calc(4rem + env(safe-area-inset-bottom) + .5rem); min-width: 15rem; padding: .4rem; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow-3); display: grid; }
	.more-menu a { display: flex; align-items: center; gap: .75rem; padding: .75rem .9rem; color: var(--fg); text-decoration: none; border-radius: var(--radius-s); }
	.more-menu a:hover { background: var(--surface-2); }

	.menu-theme { padding: .5rem .9rem; border-top: 1px solid var(--line); }
	@media (min-width: 52rem) { .mob, .tabbar, .more-menu, .scrim { display: none !important; } }
	@media (max-width: 51.99rem) {
		.desk, .desk-theme { display: none; }
		.brand { font-size: 1.05rem; }
		.tabbar { position: sticky; bottom: 0; z-index: 30; display: grid; grid-template-columns: repeat(5, 1fr); padding-bottom: env(safe-area-inset-bottom);
			background: color-mix(in srgb, var(--surface) 92%, transparent); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-top: 1px solid var(--line); }
		.tabbar a, .tabbar button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .1rem; min-height: 3.6rem; padding: 0; border: 0; border-radius: 0; background: none;
			color: var(--muted); text-decoration: none; font-size: .7rem; font-weight: 600; }
		.tabbar [aria-current='page'], .tabbar .current { color: var(--accent); }
		.foot { padding-bottom: 1rem; }
	}
</style>
