#!/usr/bin/env node
// Migration 002: add two needles on book p. 387 that the automatic extraction missed:
// "Serra de les Lluernes (576-544-545-546-547)" and "Morral del Cavall (549)". Idempotent; edits data/review/additions.json only.
// Usage: node scripts/migrations/002-lluernes-morral.mjs [projectRoot]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
const rd = (f, dflt) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : dflt);
mkdirSync(d('review'), { recursive: true });
const additions = rd('review/additions.json', []);
const all = [...rd('needles.json', []), ...additions];
let next = Math.max(...all.map((n) => +n.id.slice(1))) + 1;
const note = (h) => `Afegida a mà: l'extracció automàtica no va detectar la capçalera «${h}» (p. 387).`;
for (const [name, semirRef, heading] of [['Serra de les Lluernes', '576-544-545-546-547', 'SERRA DE LES LLUERNES (576-544-545-546-547)'], ['Morral del Cavall', '549', 'MORRAL DEL CAVALL (549)']]) {
	if (additions.some((n) => n.name === name && n.semirRef === semirRef)) { console.log('already present:', name); continue; }
	additions.push({ id: 'n' + String(next++).padStart(4, '0'), name, alternativeNames: [], regionId: 'r06', sectionId: 's35', semirRef, images: [],
		bookReferences: [{ page: 387, type: 'description' }], metadata: { extractionStatus: 'unreviewed', extractionNote: note(heading) } });
	console.log('added', name);
}
writeFileSync(d('review/additions.json'), JSON.stringify(additions, null, 1) + '\n');
