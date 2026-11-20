#!/usr/bin/env node
// Migration 010: new category «Cova / Avenc» (field `kind`). Adds the cave and pit entries the first extraction missed (Els Pouetons, Pou de l'Enclusa,
// Pou de la Sajolida, Pou de la Costa Dreta, Coves del Salnitre, Cova Freda, Cova Gran, Cova de les Abelles) and marks the ones already present
// (Pou de l'Estevet, Avenc de l'Agulla o d'en Barberà) in data/review/kinds.json. Idempotent; all new entries are "unreviewed".
// Usage: node scripts/migrations/010-caves-pits.mjs [projectRoot]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '../..')), d = (f) => join(root, 'data', f);
const rd = (f, dflt) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : dflt);
mkdirSync(d('review'), { recursive: true });
const sections = rd('sections.json', []).sort((a, b) => a.order - b.order);
const additions = rd('review/additions.json', []);
const kinds = rd('review/kinds.json', {});
let next = Math.max(...[...rd('needles.json', []), ...additions].map((n) => +n.id.slice(1))) + 1;
const items = [
	[56, "Els Pouetons", 'avenc', "ELS POUETONS (Avenc)"], [119, "Pou de l'Enclusa", 'avenc', "POU DE L'ENCLUSA (Avenc)"],
	[241, 'Pou de la Sajolida', 'avenc', 'POU DE LA SAJOLIDA (Avenc)'], [292, 'Pou de la Costa Dreta', 'avenc', 'POU DE LA COSTA DRETA (Avenc)'],
	[313, 'Coves del Salnitre', 'cova', 'Coves del Salnitre'], [313, 'Cova Freda', 'cova', 'Cova Freda'], [313, 'Cova Gran', 'cova', 'Cova Gran'],
	[314, 'Cova de les Abelles', 'cova', 'Cova de les Abelles']
];
let added = 0;
for (const [page, name, kind, heading] of items) {
	if (additions.some((n) => n.name === name && n.bookReferences[0].page === page)) continue;
	const sec = [...sections].reverse().find((s) => s.bookReference.pageStart <= page);
	additions.push({
		id: 'n' + String(next++).padStart(4, '0'), name, alternativeNames: name === 'Cova Gran' ? ['Cova Vella'] : [], kind, regionId: sec.regionId, sectionId: sec.id, images: [],
		bookReferences: [{ page, type: 'description' }],
		metadata: { extractionStatus: 'unreviewed', extractionNote: `Afegida a mà: entrada «${heading}» (p. ${page}) no recollida per l'extracció automàtica.` }
	});
	added++;
}
for (const [id, kind] of [['n0519', 'avenc'], ['n0311', 'avenc']]) kinds[id] = kinds[id] ?? kind;      // Pou de l'Estevet, Avenc de l'Agulla o d'en Barberà
writeFileSync(d('review/additions.json'), JSON.stringify(additions, null, 1) + '\n');
writeFileSync(d('review/kinds.json'), JSON.stringify(kinds, null, 1) + '\n');
console.log(`010: ${added} caves/pits added; ${Object.keys(kinds).length} entries marked in kinds.json`);
