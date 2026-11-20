#!/usr/bin/env node
// Migration 023: region panoramas printed below running text — p.123 Frares Encantats, p.257 Tebes, p.358 Tebaida — → data/book-panoramas.json.
// Idempotent (merged by id). Then: python3 scripts/coverage.py, and copy static/images/drawings/pano-r02-*, pano-r05-*, pano-r06-* (+ d123, d257, d358).
// Usage: node scripts/migrations/023-book-panoramas-2.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), f = join(root, 'data/book-panoramas.json');
const have = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
const add = JSON.parse(readFileSync(new URL('./023-book-panoramas-2.json', import.meta.url), 'utf8')).filter((p) => !have.some((h) => h.id === p.id));
writeFileSync(f, JSON.stringify([...have, ...add], null, 1) + '\n');
console.log(`023: ${add.length} panoramas added (${have.length + add.length} in total)`);
