#!/usr/bin/env node
// Migration 001: add the needle "El Cavall Bernat (548)", whose heading the automatic extraction missed (text p. 389-391, drawing p. 388).
// Idempotent; edits only data/review/additions.json, data/drawings.json and data/source/drawings-manual.csv, in place.
// Usage: node scripts/migrations/001-cavall-bernat.mjs [projectRoot]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
const rd = (f, dflt) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : dflt);
const wr = (f, v) => writeFileSync(d(f), JSON.stringify(v, null, 1) + '\n');
mkdirSync(d('review'), { recursive: true });

const all = [...rd('needles.json', []), ...rd('review/additions.json', [])];
const id = 'n' + String(Math.max(...all.map((n) => +n.id.slice(1))) + 1).padStart(4, '0');
const additions = rd('review/additions.json', []);
let needle = additions.find((n) => n.name === 'El Cavall Bernat' && n.semirRef === '548');
if (!needle) {
	needle = {
		id, name: 'El Cavall Bernat', alternativeNames: [], regionId: 'r06', sectionId: 's35', semirRef: '548', images: [],
		bookReferences: [{ page: 389, type: 'description' }, { page: 390, type: 'description' }, { page: 391, type: 'description' }],     // the plate (p. 388) is a drawing: assigned below, not a text page,
		metadata: { extractionStatus: 'unreviewed', extractionNote: "Afegida a mà: l'extracció automàtica no va detectar la capçalera «EL CAVALL BERNAT (548)» (p. 389); la darrera roca de la secció XXXV." }
	};
	additions.push(needle); wr('review/additions.json', additions); console.log('added needle', needle.id);
} else console.log('needle already present:', needle.id);

const dr = rd('drawings.json', {});
if (!(dr[needle.id] ?? []).includes(388)) { dr[needle.id] = [...(dr[needle.id] ?? []), 388].sort((a, b) => a - b); wr('drawings.json', Object.fromEntries(Object.entries(dr).sort(([a], [b]) => a.localeCompare(b)))); console.log('drawing p388 assigned'); }
const csv = d('source/drawings-manual.csv'); mkdirSync(join(root, 'data/source'), { recursive: true });
const rows = existsSync(csv) ? readFileSync(csv, 'utf8').trimEnd().split('\n') : ['page,needle_id,action,reason'];
const line = `388,${needle.id},add,"Title ""EL CAVALL BERNAT -548-""; needle added by migration 001"`;
if (!rows.some((r) => r.startsWith(`388,${needle.id},`))) { rows.push(line); writeFileSync(csv, rows.join('\n') + '\n'); }
