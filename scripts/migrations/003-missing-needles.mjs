#!/usr/bin/env node
// Migration 003: add the needles the automatic extraction missed (headings found by scripts/find-missing-needles.py and curated by hand;
// list in 003-candidates.json, each with the page it starts on and the needle it follows in book order). Idempotent; edits data/review/additions.json only.
// Every new needle is "unreviewed" and can be rejected/merged/corrected from the web editor or the review queue.
// Usage: node scripts/migrations/003-missing-needles.mjs [projectRoot]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '../..')), d = (f) => join(root, 'data', f);
const rd = (f, dflt) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : dflt);
mkdirSync(d('review'), { recursive: true });
const sections = rd('sections.json', []).sort((a, b) => a.order - b.order);
const additions = rd('review/additions.json', []);
let next = Math.max(...[...rd('needles.json', []), ...additions].map((n) => +n.id.slice(1))) + 1;
const cands = JSON.parse(readFileSync(join(here, '003-candidates.json'), 'utf8'));
let added = 0;
for (const c of cands) {
	if (additions.some((n) => n.name === c.name && (n.semirRef ?? null) === (c.semir ?? null) && n.bookReferences[0].page === c.page)) continue;
	const sec = [...sections].reverse().find((s) => s.bookReference.pageStart <= c.page);
	additions.push({
		id: 'n' + String(next++).padStart(4, '0'), name: c.name, alternativeNames: c.alt, regionId: sec.regionId, sectionId: sec.id,
		...(c.semir ? { semirRef: c.semir } : {}), images: [], bookReferences: [{ page: c.page, type: 'description' }], ...(c.after ? { after: c.after } : {}),
		metadata: { extractionStatus: 'unreviewed', extractionNote: `Afegida a mà: capçalera «${c.heading}» detectada a l'OCR (p. ${c.page}) i no recollida per l'extracció automàtica.` }
	});
	added++;
}
writeFileSync(d('review/additions.json'), JSON.stringify(additions, null, 1) + '\n');

// drawing plates (book pages that hold only the drawing) found for some of the new needles: assigned like the editor does (drawings.json + manual ledger)
const dr = rd('drawings.json', {}), csv = d('source/drawings-manual.csv');
mkdirSync(join(root, 'data/source'), { recursive: true });
const rows = existsSync(csv) ? readFileSync(csv, 'utf8').trimEnd().split('\n') : ['page,needle_id,action,reason'];
for (const c of cands.filter((x) => x.drawings)) {
	const n = additions.find((a) => a.name === c.name && a.bookReferences[0].page === c.page);
	for (const p of c.drawings) {
		if (!(dr[n.id] ?? []).includes(p)) dr[n.id] = [...(dr[n.id] ?? []), p].sort((a, b) => a - b);
		if (!rows.some((r) => r.startsWith(`${p},${n.id},`))) rows.push(`${p},${n.id},add,"Drawing plate of ${c.name}; needle added by migration 003"`);
	}
}
writeFileSync(d('drawings.json'), JSON.stringify(Object.fromEntries(Object.entries(dr).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
writeFileSync(csv, rows.join('\n') + '\n');
console.log(`added ${added} needles (${additions.length} additions in total)`);
