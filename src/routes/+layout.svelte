<script lang="ts">
	import '../app.css';
	import { base } from '$app/paths';
	let { children } = $props();
</script>

<header>
	<a class="brand" href="{base}/">Montserrat Pam a Pam</a>
	<nav aria-label="Navegació principal">
		<a href="{base}/">Regions</a>
		<a href="{base}/map/">Mapa</a>
	</nav>
</header>
<main>{@render children()}</main>
<footer>
	<p>Edició digital de <em>Montserrat pam a pam</em>, de Josep Barberà i Sauqué (Publicacions de l'Abadia de Montserrat, 1977). <strong>Dades en revisió:</strong> les fitxes provenen d'una extracció automàtica i no estan verificades.</p>
</footer>
