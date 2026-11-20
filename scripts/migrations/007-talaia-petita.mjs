#!/usr/bin/env node
// Migration 007: add «La Talaia Petita» (Semir 306; heading «Talaia Petita (306)» on p.208, no drawing plate).
// The automatic extraction missed it (it sits inside the «Les Talaies» group, after La Talaia Gran). Idempotent; edits data/review/additions.json only. The needle is "unreviewed" and can be corrected from the web editor.
// Usage: node scripts/migrations/007-talaia-petita.mjs [projectRoot]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '../..')), d = (f) => join(root, 'data', f);
const rd = (f, dflt) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : dflt);
mkdirSync(d('review'), { recursive: true }); mkdirSync(d('source'), { recursive: true });
const c = { page: 208, name: 'La Talaia Petita', semir: '306', after: 'n0570', heading: 'Talaia Petita (306)' };
const sections = rd('sections.json', []).sort((a, b) => a.order - b.order);
const additions = rd('review/additions.json', []);
let n = additions.find((a) => a.name === c.name && String(a.semirRef ?? '') === c.semir && a.bookReferences[0].page === c.page);
if (!n) {
	const id = 'n' + String(Math.max(...[...rd('needles.json', []), ...additions].map((x) => +x.id.slice(1))) + 1).padStart(4, '0');
	const sec = [...sections].reverse().find((s) => s.bookReference.pageStart <= c.page);
	n = {
		id, name: c.name, alternativeNames: [], regionId: sec.regionId, sectionId: sec.id, semirRef: c.semir, images: [],
		bookReferences: [{ page: c.page, type: 'description' }], after: c.after,
		metadata: { extractionStatus: 'unreviewed', extractionNote: `Afegida a mà: capçalera «${c.heading}» (p. ${c.page}) dins del grup «Les Talaies»` }
	};
	additions.push(n);
	writeFileSync(d('review/additions.json'), JSON.stringify(additions, null, 1) + '\n');
}
console.log(`007: ${n.id} ${n.name}`);
