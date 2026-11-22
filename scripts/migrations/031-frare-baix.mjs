#!/usr/bin/env node
// Migration 031: n0357 «El Frare Baix del Clot de la Mònica» is only the caption of the p. 289 drawing; the book entry is n0358 (p. 290). Rejects n0357
// and moves its drawing (p. 289) to n0358. Idempotent.
// Usage: node scripts/migrations/031-frare-baix.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
const rd = (f, fb) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : fb);
const dec = rd('review/decisions.json', []), dr = rd('drawings.json', {});
let n = 0;
if (!dec.some((x) => x.needleId === 'n0357' && x.action === 'reject')) {
	dec.push({ needleId: 'n0357', action: 'reject', reviewer: 'Marc (revisió punt 5)', date: new Date().toISOString().slice(0, 10), reason: 'peu del dibuix de la p. 289: és el Frare de Baix del Clot de la Mònica (n0358)' });
	n++;
}
if (dr.n0357) { dr.n0358 = [...new Set([...(dr.n0358 ?? []), ...dr.n0357])].sort((a, b) => a - b); delete dr.n0357; n++; }
writeFileSync(d('review/decisions.json'), JSON.stringify(dec, null, 1) + '\n');
writeFileSync(d('drawings.json'), JSON.stringify(dr, null, 1) + '\n');
console.log(`031: ${n} changes`);
