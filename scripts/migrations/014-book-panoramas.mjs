#!/usr/bin/env node
// Migration 014: the panoramic views printed in the book (pp. 32–33 Cadireta–Portella, 217 Paret de l'Aeri–Serrat del Moro, 223 Regió de Sant Jeroni)
// are shown on their region's page → data/book-panoramas.json. Idempotent (merged by id). Then: python3 scripts/coverage.py, and copy the images
// static/images/drawings/pano-*.webp (+ d032, d033, d217, d223).
// Usage: node scripts/migrations/014-book-panoramas.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), f = join(root, 'data/book-panoramas.json');
const have = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
const add = JSON.parse(readFileSync(new URL('./014-book-panoramas.json', import.meta.url), 'utf8')).filter((p) => !have.some((h) => h.id === p.id));
writeFileSync(f, JSON.stringify([...have, ...add], null, 1) + '\n');
console.log(`014: ${add.length} panoramas added (${have.length + add.length} in total)`);
