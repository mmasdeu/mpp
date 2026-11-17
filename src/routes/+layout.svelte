<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';
	import { net } from '$lib/pwa/offline.svelte';
	let { children } = $props();
</script>

<header>
	<a class="brand" href="{base}/">Montserrat Pam a Pam</a>
	<nav aria-label="Navegació principal">
		<a href="{base}/">Regions</a>
		<a href="{base}/map/">Mapa</a>
		<a href="{base}/panoramas/">Panorames</a>
		<a href="{base}/search/">Cerca</a>
	</nav>
</header>
{#if !net.online}
	<div class="offline-banner" role="status">Sense connexió: es mostra el contingut desat. El mapa de fons no està disponible. <a href="{base}/offline/">Més informació</a></div>
{/if}
<main>{@render children()}</main>
<footer>
	<p><a href="{base}/offline/">Ús sense connexió</a></p>
	<p>Edició digital de <em>Montserrat pam a pam</em>, de Josep Barberà i Sauqué (Publicacions de l'Abadia de Montserrat, 1977). <strong>Dades en revisió:</strong> les fitxes provenen d'una extracció automàtica i no estan verificades.</p>
</footer>
