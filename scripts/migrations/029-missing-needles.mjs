#!/usr/bin/env node
// Migration 029 (review points 2 and 3): adds El Cap de Guerrer (p. 61, read as part of n0065 Roca de la Partió) and Roca del Tinter
// (p. 265, read as part of n0321 Serrat de l'Artiga Alta), and rejects two entries that are not book entries: n0546 «La Mamella» (the
// caption of the p. 285 drawing of n0334) and n0394 «Sector Coves» (a sector heading; its text belongs to n0657 Coves del Salnitre).
// The texts are then moved in data/textos.json (npm run textos). Idempotent.
// Usage: node scripts/migrations/029-missing-needles.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
const rd = (f, fb) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : fb);
const raw = rd('needles.json', []), add = rd('review/additions.json', []), dec = rd('review/decisions.json', []);
const all = [...(Array.isArray(raw) ? raw : raw.needles), ...add];
const items = [
	{ id: 'n0676', name: 'El Cap de Guerrer', alternativeNames: ['Bola de la Bitlla'], semirRef: '60', page: 61, after: 'n0065', heading: 'EL CAP DE GUERRER (60) (Bola de la Bitlla)' },
	{ id: 'n0677', name: 'Roca del Tinter', alternativeNames: [], semirRef: '467A', page: 265, after: 'n0321', heading: 'Roca del Tinter (467 A)' }
];
let n = 0, r = 0;
for (const e of items) {
	if (add.some((a) => a.id === e.id)) continue;
	const prev = all.find((x) => x.id === e.after);
	if (!prev) { console.warn(`029: ${e.after} not found, ${e.name} skipped`); continue; }
	add.push({ id: e.id, name: e.name, alternativeNames: e.alternativeNames, regionId: prev.regionId, sectionId: prev.sectionId, semirRef: e.semirRef,
		after: e.after, images: [], bookReferences: [{ page: e.page, type: 'description' }],
		metadata: { extractionStatus: 'unreviewed', extractionNote: `Afegida a mà: entrada «${e.heading}» (p. ${e.page}), llegida com a part del text de ${e.after}.` } });
	n++;
}
const date = new Date().toISOString().slice(0, 10);
for (const [id, reason] of [['n0546', 'peu del dibuix de la p. 285: és La Mamella (n0334)'], ['n0394', "encapçalament de sector; el text és de les Coves del Salnitre (n0657)"]]) {
	if (!all.some((x) => x.id === id) || dec.some((x) => x.needleId === id && x.action === 'reject')) continue;
	dec.push({ needleId: id, action: 'reject', reviewer: 'Marc (revisió punts 2-3)', date, reason });
	r++;
}
writeFileSync(d('review/additions.json'), JSON.stringify(add, null, 1) + '\n');
writeFileSync(d('review/decisions.json'), JSON.stringify(dec, null, 1) + '\n');
console.log(`029: ${n} entries added, ${r} rejected`);
