#!/usr/bin/env node
// Migration 026: «Roca 173» (p. 114, section 6 Frares) was missing: its entry had been read as part of another needle's text.
// Adds it after Roca 144 (n0598) with its text (data/review/decisions.json, a transcription from the OCR), and gives it the
// TOT MONTSERRAT position of Semir 173, which had been matched by number to the neighbouring «Roca Contrafort de la 173» (n0509).
// Idempotent. Then: npm run textos. Usage: node scripts/migrations/026-roca-173.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
const rd = (f, fb) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : fb), wr = (f, v) => writeFileSync(d(f), JSON.stringify(v, null, 1) + '\n');
const ID = 'n0661', today = new Date().toISOString().slice(0, 10);
const add = rd('review/additions.json', []);
if (!add.some((a) => a.id === ID)) {
	add.push({ id: ID, name: 'Roca 173', alternativeNames: [], regionId: 'r02', sectionId: 's06', semirRef: '173', after: 'n0598', images: [],
		bookReferences: [{ page: 114, type: 'description' }],
		metadata: { extractionStatus: 'unreviewed', extractionNote: 'Afegida a mà: entrada «ROCA 173» (p. 114), llegida com a part del text d\'una altra agulla.' } });
	wr('review/additions.json', add);
}
const dec = rd('review/decisions.json', []);
if (!dec.some((x) => x.needleId === ID)) {
	dec.push({ needleId: ID, action: 'correct', description: "Pujant pel camí o canal del Dit al Frare Gros, després d'haver deixat enrera les cotes abans ressenyades de la 144, el Barret i la 182, la roca següent és la 173. En trobar-nos al seu nivell i deixant el camí, un corredor arbrat ens porta al collet i fàcilment al cim.", reviewer: 'Marc (OCR de la p. 114)', date: today });
	dec.sort((a, b) => a.needleId.localeCompare(b.needleId));
	wr('review/decisions.json', dec);
}
const locs = rd('locations.json', []);
const tot = locs.find((l) => l.needleId === 'n0509' && /TOT MONTSERRAT/.test(l.source ?? '') && l.matchedBy === 'semir');
if (tot && !locs.some((l) => l.needleId === ID)) wr('locations.json', [...locs.filter((l) => l !== tot), { ...tot, needleId: ID }].sort((a, b) => a.needleId.localeCompare(b.needleId)));
console.log('026: Roca 173 (n0661)' + (tot ? ', position moved from n0509' : ''));
