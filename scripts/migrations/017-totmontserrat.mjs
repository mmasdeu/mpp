#!/usr/bin/env node
// Migration 017: coordinates from TOT MONTSERRAT's list of needles by section (https://totmontserrat.cat/muntanya/agulles/agulles/, 2015,
// UTM ETRS89 31N → WGS84) for needles that had none. Matched by Semir number (unique in the book) or, for needles without a number, by
// exact name; groups ("Roques 374 375 376 377") get the centroid of their rocks. Only added where a needle has no location yet.
// Then: python3 scripts/coverage.py is not needed. Usage: node scripts/migrations/017-totmontserrat.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), f = join(root, 'data/locations.json');
const have = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
const add = JSON.parse(readFileSync(new URL('./017-totmontserrat.json', import.meta.url), 'utf8')).filter((p) => !have.some((h) => h.needleId === p.needleId));
writeFileSync(f, JSON.stringify([...have, ...add], null, 1) + '\n');
console.log(`017: ${add.length} locations added (${have.length + add.length} in total)`);
