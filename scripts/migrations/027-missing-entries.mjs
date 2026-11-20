#!/usr/bin/env node
// Migration 027: thirteen book entries that the extraction had read as part of the previous needle's text (found by their headings and
// checked on the scans): El Tub de la Patata, Serradet de Sant Jeroni, Paret NE. del Serrat del Patriarca, Roca 391, Cota 424 A,
// Roques de la Filla Alta i Baixa de la Presidenta, Cota 474, Cota 474 B, Cota 499 C, Serra Llarga, Roques de sobre l'Agulla de la Verge
// (B i C), Turó de Sant Dimes, Agulla del Riu. Each one goes right after the needle that held its text, in the same section.
// The texts are then moved out of those needles in data/textos.json (npm run textos). Idempotent.
// Usage: node scripts/migrations/027-missing-entries.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
const rd = (f, fb) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : fb);
const raw = rd('needles.json', []), add = rd('review/additions.json', []);
const all = [...(Array.isArray(raw) ? raw : raw.needles), ...add];
let n = 0;
for (const e of JSON.parse(readFileSync(new URL('./027-missing-entries.json', import.meta.url), 'utf8'))) {
	if (add.some((a) => a.id === e.id)) continue;
	const prev = all.find((x) => x.id === e.after);
	if (!prev) { console.warn(`027: ${e.after} not found, ${e.name} skipped`); continue; }
	add.push({ id: e.id, name: e.name, alternativeNames: e.alternativeNames ?? [], regionId: prev.regionId, sectionId: prev.sectionId,
		...(e.semirRef ? { semirRef: e.semirRef } : {}), after: e.after, images: [], bookReferences: [{ page: e.page, type: 'description' }],
		metadata: { extractionStatus: 'unreviewed', extractionNote: `Afegida a mà: entrada «${e.heading}» (p. ${e.page}), llegida com a part del text de ${e.after}.` } });
	n++;
}
writeFileSync(d('review/additions.json'), JSON.stringify(add, null, 1) + '\n');
console.log(`027: ${n} entries added`);
