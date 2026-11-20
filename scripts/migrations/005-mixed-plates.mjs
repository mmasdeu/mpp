#!/usr/bin/env node
// Migration 005: drawings printed on pages that also carry text (found by scripts/detect-mixed-plates.py). Idempotent.
//  - data/source/drawings-crops.json: where each such drawing starts/ends on its page (so the cutout leaves the paragraph out)
//  - data/source/drawings-manual.csv + data/drawings.json: the new assignments (and n0007 → n0004 for p.15), applied like the editor does
// Existing editor decisions are kept: only the listed page/needle pairs are touched.
// Usage: node scripts/migrations/005-mixed-plates.mjs [projectRoot]   (then copy the new static/images/drawings/*.webp, see docs/book-pages.md)
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '../..')), d = (f) => join(root, 'data', f);
mkdirSync(d('source'), { recursive: true });
copyFileSync(join(here, '005-drawings-crops.json'), d('source/drawings-crops.json'));
const changes = JSON.parse(readFileSync(join(here, '005-mixed-plates.json'), 'utf8'));
const drawings = existsSync(d('drawings.json')) ? JSON.parse(readFileSync(d('drawings.json'), 'utf8')) : {};
const csvPath = d('source/drawings-manual.csv');
let csv = existsSync(csvPath) ? readFileSync(csvPath, 'utf8') : 'page,needle_id,action,reason\n';
if (!csv.endsWith('\n')) csv += '\n';
let n = 0;
for (const c of changes) {
	if (!new RegExp(`^${c.page},${c.needle},${c.action},`, 'm').test(csv)) csv += `${c.page},${c.needle},${c.action},"${c.reason.replaceAll('"', '""')}"\n`;
	const cur = drawings[c.needle] ?? [];
	const has = cur.includes(c.page);
	if (c.action === 'add' && !has) { drawings[c.needle] = [...cur, c.page].sort((a, b) => a - b); n++; }
	if (c.action === 'remove' && has) { drawings[c.needle] = cur.filter((p) => p !== c.page); n++; }
}
for (const k of Object.keys(drawings)) if (!drawings[k].length) delete drawings[k];
writeFileSync(csvPath, csv);
writeFileSync(d('drawings.json'), JSON.stringify(Object.fromEntries(Object.entries(drawings).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
console.log(`005: ${n} drawing assignments applied; ${Object.keys(JSON.parse(readFileSync(join(here, '005-drawings-crops.json'), 'utf8'))).length} mixed pages with a crop`);
