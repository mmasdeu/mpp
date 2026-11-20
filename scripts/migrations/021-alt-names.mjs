#!/usr/bin/env node
// Migration 021: alternative names from the book's index (Nomenclàtor, pp. 398–405, see data/ocr/nomenclator-informe.csv) →
// data/review/alt-names.json {needleId: [names]}. Idempotent: names merged per needle without duplicates.
// Usage: node scripts/migrations/021-alt-names.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), f = join(root, 'data/review/alt-names.json');
const have = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
const add = JSON.parse(readFileSync(new URL('./021-alt-names.json', import.meta.url), 'utf8'));
let n = 0;
for (const [id, names] of Object.entries(add)) for (const x of names) if (!(have[id] ??= []).includes(x)) { have[id].push(x); n++; }
writeFileSync(f, JSON.stringify(Object.fromEntries(Object.entries(have).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
console.log(`021: ${n} alternative names added`);
