#!/usr/bin/env node
// Migration 016: re-segmented climbers' biographies (22 instead of 15: Anglada, Cerdà, Estorach, Estrems, Garcia (Boix), Simó, Torras i Homet were
// merged into the previous entry). Names/pages of entries without a reviewer's `text` are refreshed; entries gone from the new list are removed
// unless reviewed. Then: python3 scripts/segment-biographies.py && python3 scripts/coverage.py.
// Usage: node scripts/migrations/016-biographies-resegment.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), f = join(root, 'data/review/biographies.json');
const have = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
const neu = JSON.parse(readFileSync(new URL('./015-biographies.json', import.meta.url), 'utf8'));
const out = neu.map((n) => { const h = have.find((x) => x.id === n.id); return h?.text ? h : n; });
for (const h of have) if (h.text && !out.some((o) => o.id === h.id)) out.push(h);
writeFileSync(f, JSON.stringify(out, null, 1) + '\n');
console.log(`016: ${out.length} biographies (${have.length} before)`);
