#!/usr/bin/env node
// Migration 008: entries whose Title-case heading the first extraction missed, found by scripts/find-missing-headings.py and checked in the OCR text
// (La Petxina, Roca 393, Roca 314, Roca del Coll del Llum, Roca 307, Roca de l'Esperança, Roca d'en Carles Roig, Cota 445, Cota 446).
// Also places La Talaia Petita (migration 007) in book order. Idempotent; edits data/review/additions.json only. All are "unreviewed".
// Usage: node scripts/migrations/008-missing-headings.mjs [projectRoot]
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
// book order: [page, name, semir, heading as printed]; the first of each chain follows `start`
const chains = [
	{ start: 'n0570', items: [[207, 'La Petxina', '305', 'La Petxina (305)'], [207, 'Roca 393', '393', 'Roca 393'], [208, 'Roca 314', '314', 'Roca 314'],
		[208, 'Roca del Coll del Llum', '313', 'Roca del Coll del Llum (313)']], then: 'n0571' },     // …then La Talaia Petita (007), then Roca 307
	{ start: 'n0571', items: [[208, 'Roca 307', '307', 'Roca 307']] },
	{ start: 'n0318', items: [[262, "Roca de l'Esperança", '443', "Roca de l'Esperança (443)"], [262, "Roca d'en Carles Roig", '444', "Roca d'en Carles Roig (444)"],
		[263, 'Cota 445', '445', 'Cota 445'], [263, 'Cota 446', '446', 'Cota 446']] }
];
const find = (name, page) => additions.find((n) => n.name === name && n.bookReferences[0].page === page);
let added = 0;
for (const ch of chains) {
	let prev = ch.start, last = null;
	for (const [page, name, semir, heading] of ch.items) {
		let n = find(name, page);
		if (!n) {
			const sec = [...sections].reverse().find((s) => s.bookReference.pageStart <= page);
			n = { id: 'n' + String(next++).padStart(4, '0'), name, alternativeNames: [], regionId: sec.regionId, sectionId: sec.id, semirRef: semir, images: [],
				bookReferences: [{ page, type: 'description' }], after: prev,
				metadata: { extractionStatus: 'unreviewed', extractionNote: `Afegida a mà: capçalera «${heading}» (p. ${page}) no recollida per l'extracció automàtica.` } };
			additions.push(n); added++;
		}
		prev = n.id; last = n;
	}
	if (ch.then && last) { const t = additions.find((n) => n.id === ch.then); if (t) t.after = last.id; }          // Talaia Petita follows Roca del Coll del Llum
}
writeFileSync(d('review/additions.json'), JSON.stringify(additions, null, 1) + '\n');
console.log(`008: ${added} needles added (${additions.length} additions in total)`);
