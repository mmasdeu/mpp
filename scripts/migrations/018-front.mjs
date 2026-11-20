#!/usr/bin/env node
// Migration 018: the book's front matter on the home page — data/front.json (Advertiment, pp. 5–6; general map, p. 7) and an empty
// data/review/front.json (reviewed transcriptions). Idempotent (entries merged by id). Then: python3 scripts/segment-front.py
// (OCR → data/ocr/front.json), python3 scripts/coverage.py, npm run textos.
// Usage: node scripts/migrations/018-front.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), f = join(root, 'data/front.json'), r = join(root, 'data/review/front.json');
const have = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
const add = JSON.parse(readFileSync(new URL('./018-front.json', import.meta.url), 'utf8')).filter((p) => !have.some((h) => h.id === p.id));
writeFileSync(f, JSON.stringify([...have, ...add], null, 1) + '\n');
if (!existsSync(r)) writeFileSync(r, '{}\n');
console.log(`018: ${add.length} front-matter entries added (${have.length + add.length} in total)`);
