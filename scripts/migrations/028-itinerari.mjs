#!/usr/bin/env node
// Migration 028: new kind «itinerari» (route). Adds «Camí del Joc de l'Oca (Torrent de Migdia)» (p. 248), whose description the extraction had
// read as part of n0297 Roca de la Trinxada; it goes right after it. The text is then moved in data/textos.json (npm run textos). Idempotent.
// Usage: node scripts/migrations/028-itinerari.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
const rd = (f, fb) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : fb);
const raw = rd('needles.json', []), add = rd('review/additions.json', []);
const prev = [...(Array.isArray(raw) ? raw : raw.needles), ...add].find((x) => x.id === 'n0297');
if (add.some((a) => a.id === 'n0675')) console.log('028: already applied');
else if (!prev) console.warn('028: n0297 not found, skipped');
else {
	add.push({ id: 'n0675', name: "Camí del Joc de l'Oca", alternativeNames: ['Torrent de Migdia'], kind: 'itinerari', regionId: prev.regionId, sectionId: prev.sectionId,
		after: 'n0297', images: [], bookReferences: [{ page: 248, type: 'description' }],
		metadata: { extractionStatus: 'unreviewed', extractionNote: "Afegida a mà: entrada «CAMÍ DEL JOC DE L'OCA (TORRENT DE MIGDIA)» (p. 248), llegida com a part del text de n0297." } });
	writeFileSync(d('review/additions.json'), JSON.stringify(add, null, 1) + '\n');
	console.log('028: 1 entry added');
}
