#!/usr/bin/env node
// Migration 009: numbered rocks and summits («Roca 193», «Cota 419», «Cotes 450 i 451»…) whose entry the first extraction missed (found with scripts/find-missing-headings.py
// and a numbering check against the Semir numbers already in the data; list in 009-candidates.json, each with the page it starts on and the needle it follows in book order). Idempotent; edits data/review/additions.json only.
// Every new needle is "unreviewed" and can be rejected/merged/corrected from the web editor or the review queue.
// Usage: node scripts/migrations/009-numbered-rocks.mjs [projectRoot]
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
const cands = JSON.parse(readFileSync(join(here, '009-candidates.json'), 'utf8'));
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

console.log(`added ${added} needles (${additions.length} additions in total)`);
