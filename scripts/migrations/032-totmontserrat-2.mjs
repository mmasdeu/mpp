#!/usr/bin/env node
// Migration 032: more coordinates from TOT MONTSERRAT's list (read in full this time; migration 017 only had the first rows): needles that now
// match by Semir number or name (new entries from migrations 027-029 included). Groups get the centroid of their rocks. Only added where a
// needle has no location yet. Usage: node scripts/migrations/032-totmontserrat-2.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), f = join(root, 'data/locations.json');
const have = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
const add = JSON.parse(readFileSync(new URL('./032-totmontserrat-2.json', import.meta.url), 'utf8')).filter((p) => !have.some((h) => h.needleId === p.needleId));
writeFileSync(f, JSON.stringify([...have, ...add], null, 1) + '\n');
console.log(`032: ${add.length} locations added (${have.length + add.length} in total)`);
