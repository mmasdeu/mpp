#!/usr/bin/env node
// Migration 020: the index («Nomenclàtor», pp. 398–405) was checked against the needles (report: data/ocr/nomenclator-informe.csv) →
// listed in data/front.json as "kind": "index", so scripts/coverage.py counts its pages as processed. Idempotent (merged by id).
// Then: python3 scripts/coverage.py. Usage: node scripts/migrations/020-nomenclator.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), f = join(root, 'data/front.json');
const have = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
const add = JSON.parse(readFileSync(new URL('./020-nomenclator.json', import.meta.url), 'utf8')).filter((p) => !have.some((h) => h.id === p.id));
writeFileSync(f, JSON.stringify([...have, ...add], null, 1) + '\n');
console.log(`020: ${add.length} entries added to data/front.json`);
