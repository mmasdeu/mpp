#!/usr/bin/env node
// Migration 013: p.188 is the region map «Sant Jeroni» (it was counted as a drawing) → data/maps.json regions.r04 (+ maps-manual.csv). Idempotent.
// Usage: node scripts/migrations/013-region-map-sant-jeroni.mjs [projectRoot]   (then: python3 scripts/coverage.py, and copy static/images/drawings/d188.webp)
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
mkdirSync(d('source'), { recursive: true });
const maps = existsSync(d('maps.json')) ? JSON.parse(readFileSync(d('maps.json'), 'utf8')) : { sections: {}, regions: {} };
maps.regions.r04 = [...new Set([...(maps.regions.r04 ?? []), 188])];
writeFileSync(d('maps.json'), JSON.stringify(maps, null, 1) + '\n');
let t = existsSync(d('source/maps-manual.csv')) ? readFileSync(d('source/maps-manual.csv'), 'utf8') : 'page,target,action,reason\n';
if (!t.endsWith('\n')) t += '\n';
if (!t.split('\n').some((l) => l.startsWith('188,r04,'))) t += '188,r04,add,"Region map Sant Jeroni"\n';
writeFileSync(d('source/maps-manual.csv'), t);
console.log('013: region map p.188 → Sant Jeroni (r04)');
