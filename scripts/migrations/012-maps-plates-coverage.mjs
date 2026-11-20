#!/usr/bin/env node
// Migration 012: reviewer corrections found on the coverage page. Idempotent; touches only the listed entries.
//  - p.334 is the region map «Regió de la Tebaida» (printed sideways; cut-out rotated by scripts/crop-drawings.py) → data/maps.json regions.r06 (+ maps-manual.csv)
//  - p.317 drawing «Serrat dels Escolans -474C-» belongs to n0549 Roques dels Escolans → data/drawings.json (+ drawings-manual.csv)
//  - p.406 (index of unnamed rocks, already counted) and p.409 (back cover) are not content → data/source/coverage-manual.csv, status "ignored"
// Usage: node scripts/migrations/012-maps-plates-coverage.mjs [projectRoot]   (then: python3 scripts/coverage.py, and copy static/images/drawings/d334.webp)
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
mkdirSync(d('source'), { recursive: true });
const rdj = (f, dflt) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : dflt);
const addRow = (file, header, startsWith, row) => {
	let t = existsSync(d(file)) ? readFileSync(d(file), 'utf8') : header + '\n';
	if (!t.endsWith('\n')) t += '\n';
	if (!t.split('\n').some((l) => l.startsWith(startsWith))) t += row + '\n';
	writeFileSync(d(file), t);
};
const maps = rdj('maps.json', { sections: {}, regions: {} });
maps.regions.r06 = [...new Set([...(maps.regions.r06 ?? []), 334])];
writeFileSync(d('maps.json'), JSON.stringify(maps, null, 1) + '\n');
addRow('source/maps-manual.csv', 'page,target,action,reason', '334,r06,', '334,r06,add,"Region map Regió de la Tebaida (printed sideways)"');
const dr = rdj('drawings.json', {});
dr.n0549 = [...new Set([...(dr.n0549 ?? []), 317])].sort((a, b) => a - b);
writeFileSync(d('drawings.json'), JSON.stringify(Object.fromEntries(Object.entries(dr).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
addRow('source/drawings-manual.csv', 'page,needle_id,action,reason', '317,n0549,', '317,n0549,add,"Title ""SERRAT DELS ESCOLANS -474C-""; needle Roques dels Escolans has Semir 474C"');
addRow('source/coverage-manual.csv', 'unit,status,where,note', 'p406-d1,', 'p406-d1,ignored,,Índex de roques sense nom (ja comptabilitzades a les fitxes)');
addRow('source/coverage-manual.csv', 'unit,status,where,note', 'p409-d1,', 'p409-d1,ignored,,Contracoberta');
console.log('012: region map p.334 → Tebaida, plate p.317 → n0549, p.406 and p.409 ignored');
