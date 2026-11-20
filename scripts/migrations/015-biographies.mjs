#!/usr/bin/env node
// Migration 015: index of the climbers' biographies (book pp. 392–397) → data/review/biographies.json (names + pages; merged by id, existing
// entries untouched). The OCR text itself is produced by `python3 scripts/segment-biographies.py` (data/ocr/biographies.json, git-ignored).
// Then: python3 scripts/coverage.py.
// Usage: node scripts/migrations/015-biographies.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), f = join(root, 'data/review/biographies.json');
const have = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
const add = JSON.parse(readFileSync(new URL('./015-biographies.json', import.meta.url), 'utf8')).filter((p) => !have.some((h) => h.id === p.id));
writeFileSync(f, JSON.stringify([...have, ...add], null, 1) + '\n');
console.log(`015: ${add.length} biographies added (${have.length + add.length} in total)`);
