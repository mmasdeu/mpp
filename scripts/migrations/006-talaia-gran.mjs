#!/usr/bin/env node
// Migration 006: add «La Talaia Gran» (Semir 304; heading «Talaia Gran (304)» on p.206, drawing plate «LA TALAIA GRAN -304-» on p.205).
// The automatic extraction missed it (it sits inside the «Les Talaies» group). Idempotent; edits data/review/additions.json, data/drawings.json
// and data/source/drawings-manual.csv. The needle is "unreviewed" and can be corrected from the web editor.
// Usage: node scripts/migrations/006-talaia-gran.mjs [projectRoot]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '../..')), d = (f) => join(root, 'data', f);
const rd = (f, dflt) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : dflt);
mkdirSync(d('review'), { recursive: true }); mkdirSync(d('source'), { recursive: true });
const c = { page: 206, name: 'La Talaia Gran', semir: '304', after: 'n0263', heading: 'Talaia Gran (304)', drawing: 205 };
const sections = rd('sections.json', []).sort((a, b) => a.order - b.order);
const additions = rd('review/additions.json', []);
let n = additions.find((a) => a.name === c.name && String(a.semirRef ?? '') === c.semir && a.bookReferences[0].page === c.page);
if (!n) {
	const id = 'n' + String(Math.max(...[...rd('needles.json', []), ...additions].map((x) => +x.id.slice(1))) + 1).padStart(4, '0');
	const sec = [...sections].reverse().find((s) => s.bookReference.pageStart <= c.page);
	n = {
		id, name: c.name, alternativeNames: [], regionId: sec.regionId, sectionId: sec.id, semirRef: c.semir, images: [],
		bookReferences: [{ page: c.page, type: 'description' }], after: c.after,
		metadata: { extractionStatus: 'unreviewed', extractionNote: `Afegida a mà: capçalera «${c.heading}» (p. ${c.page}) dins del grup «Les Talaies»; làmina a la p. ${c.drawing}.` }
	};
	additions.push(n);
	writeFileSync(d('review/additions.json'), JSON.stringify(additions, null, 1) + '\n');
}
const dr = rd('drawings.json', {});
if (!(dr[n.id] ?? []).includes(c.drawing)) dr[n.id] = [...(dr[n.id] ?? []), c.drawing].sort((a, b) => a - b);
writeFileSync(d('drawings.json'), JSON.stringify(Object.fromEntries(Object.entries(dr).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
const csv = d('source/drawings-manual.csv');
const rows = existsSync(csv) ? readFileSync(csv, 'utf8').trimEnd().split('\n') : ['page,needle_id,action,reason'];
if (!rows.some((r) => r.startsWith(`${c.drawing},${n.id},`))) rows.push(`${c.drawing},${n.id},add,"Title ""LA TALAIA GRAN -304-""; needle added by migration 006"`);
writeFileSync(csv, rows.join('\n') + '\n');
console.log(`006: ${n.id} ${n.name} (plate p.${c.drawing})`);
