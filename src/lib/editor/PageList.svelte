<script lang="ts">
	import { base } from '$app/paths';
	/** A list of book pages assigned to something (a needle's drawings, a section's maps): remove, move to another target, add. */
	let { pages, targets, onremove, onmove, onadd, label }: {
		pages: number[]; targets: { id: string; label: string }[]; label: string;
		onremove: (p: number) => void; onmove: (p: number, to: string) => void; onadd: (p: number) => void;
	} = $props();
	let add = $state(''); let moveTo = $state<Record<number, string>>({});
	const listId = $derived(`targets-${label.replace(/\W/g, '')}`);
	const parseTarget = (v: string) => v.split(' ')[0].trim();
	const n3 = (p: number) => String(p).padStart(3, '0');
</script>

<datalist id={listId}>{#each targets as t}<option value="{t.id} — {t.label}"></option>{/each}</datalist>
<ul class="plain page-list">
	{#each pages as p (p)}
		<li>
			{#if __BOOK_IMAGES__}<img src="{base}/images/book/p{n3(p)}.webp" alt="Pàgina {p}" width="46" />{/if}
			<span>{label} · pàgina {p}</span>
			<button type="button" onclick={() => onremove(p)}>Treu</button>
			<input list={listId} placeholder="Mou a… (id o nom)" bind:value={moveTo[p]} size="22" />
			<button type="button" onclick={() => moveTo[p] && onmove(p, parseTarget(moveTo[p]))} disabled={!moveTo[p]}>Mou</button>
		</li>
	{:else}<li class="muted">Cap.</li>{/each}
</ul>
<p>
	<label>Afegeix la pàgina <input type="number" min="1" max="409" bind:value={add} size="5" style="width:5rem" /></label>
	<button type="button" onclick={() => { const p = Number(add); if (p) onadd(p); }} disabled={!add}>Afegeix</button>
</p>

<style>
	.page-list li { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
	img { border: 1px solid var(--line); }
</style>
