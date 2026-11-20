#!/usr/bin/env node
// Migration 025: automatic clean-ups of needle names (OCR slips, capitalisation: «Deis» → «dels», «D'En» → «d'en», « O » → « o »…) and
// one Semir number read from its heading → data/review/fixes.json. Applied before the review layers (a reviewer's name wins).
// Idempotent: existing entries are kept. Then: npm run textos. Usage: node scripts/migrations/025-fixes.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), f = join(root, 'data/review/fixes.json');
const have = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
const add = JSON.parse(readFileSync(new URL('./025-fixes.json', import.meta.url), 'utf8'));
let n = 0;
for (const [id, fx] of Object.entries(add)) if (!have[id]) { have[id] = fx; n++; }
writeFileSync(f, JSON.stringify(Object.fromEntries(Object.entries(have).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
console.log(`025: ${n} fixes added`);
