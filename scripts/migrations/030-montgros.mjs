#!/usr/bin/env node
// Migration 030: one spelling, «Montgròs», everywhere: section 13 (data/sections.json) and n0212 «L'Esfinx del Montgròs» (review/fixes.json). Idempotent.
// Usage: node scripts/migrations/030-montgros.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
const rd = (f, fb) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : fb);
const secs = rd('sections.json', []), fixes = rd('review/fixes.json', {});
let n = 0;
for (const s of secs) if (s.name === 'Montgrós') { s.name = 'Montgròs'; n++; }
if (fixes.n0212?.name !== "L'Esfinx del Montgròs") { fixes.n0212 = { ...fixes.n0212, name: "L'Esfinx del Montgròs" }; n++; }
writeFileSync(d('sections.json'), JSON.stringify(secs, null, 1) + '\n');
writeFileSync(d('review/fixes.json'), JSON.stringify(fixes, null, 1) + '\n');
console.log(`030: ${n} changes`);
