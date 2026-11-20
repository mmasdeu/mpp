<script lang="ts">
	import { onMount } from 'svelte';
	import { editor, loadEditor, saveEditor } from './editor.svelte';
	onMount(loadEditor);
</script>

<div class="editor-bar" role="region" aria-label="Mode editor">
	<label><input type="checkbox" bind:checked={editor.on} onchange={saveEditor} /> <strong>Mode editor</strong></label>
	{#if editor.on}
		<label>Revisor/a <input bind:value={editor.reviewer} oninput={saveEditor} placeholder="Nom" size="14" autocomplete="name" /></label>
		<span class="muted">Els canvis s'escriuen directament als fitxers de dades del projecte (carpeta <code>data/</code>).</span>
	{/if}
	{#if editor.error}<span class="editor-error" role="alert">{editor.error}</span>{/if}
</div>

<style>
	.editor-bar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; padding: .4rem 1rem; background: #fff3cd; border-bottom: 1px solid #e0c36a; font-size: .9rem; }
	.editor-error { color: #8a1c1c; font-weight: 600; }
</style>
