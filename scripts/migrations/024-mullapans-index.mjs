#!/usr/bin/env node
// Migration 024: p.362 holds a drawing of the Tossal de Mullapans (n0445) → data/drawings.json (+ drawings-manual.csv);
// pp. 407–408 (index of sections) are not content → data/front.json as "kind": "index". Idempotent.
// Then: copy static/images/drawings/d362.webp, python3 scripts/coverage.py. Usage: node scripts/migrations/024-mullapans-index.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
const dr = JSON.parse(readFileSync(d('drawings.json'), 'utf8'));
dr.n0445 = [...new Set([...(dr.n0445 ?? []), 362])].sort((a, b) => a - b);
writeFileSync(d('drawings.json'), JSON.stringify(dr, null, 1) + '\n');
let t = existsSync(d('source/drawings-manual.csv')) ? readFileSync(d('source/drawings-manual.csv'), 'utf8') : 'page,needle_id,action,reason\n';
if (!t.endsWith('\n')) t += '\n';
if (!t.split('\n').some((l) => l.startsWith('362,n0445,'))) t += '362,n0445,add,"Drawing of the Tossal de Mullapans (route Cap del Gat) below the text"\n';
writeFileSync(d('source/drawings-manual.csv'), t);
const front = existsSync(d('front.json')) ? JSON.parse(readFileSync(d('front.json'), 'utf8')) : [];
if (!front.some((f) => f.id === 'index-seccions')) front.push({ id: 'index-seccions', title: 'Índex', pages: [407, 408], kind: 'index', note: 'Índex de seccions: no és contingut' });
writeFileSync(d('front.json'), JSON.stringify(front, null, 1) + '\n');
console.log('024: drawing p.362 → n0445; pp. 407–408 index');
