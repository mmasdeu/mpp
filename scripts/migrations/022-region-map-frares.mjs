#!/usr/bin/env node
// Migration 022: p.80 is the region map «Regió Frares Encantats» → data/maps.json regions.r02 (+ data/source/maps-manual.csv). Idempotent.
// Then: python3 scripts/crop-drawings.py (or copy d080.webp) and python3 scripts/coverage.py.
// Usage: node scripts/migrations/022-region-map-frares.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
mkdirSync(d('source'), { recursive: true });
const maps = existsSync(d('maps.json')) ? JSON.parse(readFileSync(d('maps.json'), 'utf8')) : { sections: {}, regions: {} };
maps.regions.r02 = [...new Set([...(maps.regions.r02 ?? []), 80])];
writeFileSync(d('maps.json'), JSON.stringify(maps, null, 1) + '\n');
let t = existsSync(d('source/maps-manual.csv')) ? readFileSync(d('source/maps-manual.csv'), 'utf8') : 'page,target,action,reason\n';
if (!t.endsWith('\n')) t += '\n';
if (!t.split('\n').some((l) => l.startsWith('80,r02,'))) t += '80,r02,add,"Region map Regió Frares Encantats"\n';
writeFileSync(d('source/maps-manual.csv'), t);
console.log('022: region map p.80 → Frares Encantats (r02)');
