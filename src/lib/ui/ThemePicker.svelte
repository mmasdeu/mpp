<script lang="ts">
	import { onMount } from 'svelte';
	import { THEMES, currentTheme, setTheme, type ThemeId } from './themes';
	let { id = 'theme' }: { id?: string } = $props();
	let value = $state<ThemeId>('fanzine');
	onMount(() => { value = currentTheme(); });
</script>

<label class="theme-picker" for={id}>
	<span>Estil</span>
	<select {id} bind:value onchange={() => setTheme(value)}>
		{#each THEMES as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
	</select>
</label>
