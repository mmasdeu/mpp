#!/usr/bin/env node
// Migration 019: region maps — p.130 «Regió Ecos» → r03, p.256 «Regió Tebes» (printed sideways) → r05 — in data/maps.json regions
// (+ data/source/maps-manual.csv). Idempotent. Then: python3 scripts/crop-drawings.py (or copy d130.webp/d256.webp) and python3 scripts/coverage.py.
// Usage: node scripts/migrations/019-region-maps-ecos-tebes.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
mkdirSync(d('source'), { recursive: true });
const maps = existsSync(d('maps.json')) ? JSON.parse(readFileSync(d('maps.json'), 'utf8')) : { sections: {}, regions: {} };
let t = existsSync(d('source/maps-manual.csv')) ? readFileSync(d('source/maps-manual.csv'), 'utf8') : 'page,target,action,reason\n';
if (!t.endsWith('\n')) t += '\n';
for (const [page, region, why] of [[130, 'r03', 'Region map Regió Ecos'], [256, 'r05', 'Region map Regió Tebes (printed sideways)']]) {
	maps.regions[region] = [...new Set([...(maps.regions[region] ?? []), page])];
	if (!t.split('\n').some((l) => l.startsWith(`${page},${region},`))) t += `${page},${region},add,"${why}"\n`;
}
writeFileSync(d('maps.json'), JSON.stringify(maps, null, 1) + '\n');
writeFileSync(d('source/maps-manual.csv'), t);
console.log('019: region maps p.130 → Ecos (r03), p.256 → Tebes (r05)');
