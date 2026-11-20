#!/usr/bin/env node
// Migration 004: coordinates for 115 needles that had none, proposed by scripts/geolocate.py from the ICGC 1:5.000 toponymy
// (CC BY 4.0) and OpenStreetMap (ODbL), each checked against the needles already located in its section.
// Reads data/source/geolocation/geolocate-proposals.json. Adds a record only when the needle exists with the same name and has
// no location yet, so your own edits are never overwritten. Idempotent.
// Usage: node scripts/migrations/004-geolocate.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
const rd = (f, dflt) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : dflt);
const proposals = rd('source/geolocation/geolocate-proposals.json', null);
if (!proposals) { console.error('missing data/source/geolocation/geolocate-proposals.json'); process.exit(1); }
const names = new Map([...rd('needles.json', []), ...rd('review/additions.json', [])].map((n) => [n.id, n.name]));
const locs = rd('locations.json', []);
const have = new Set(locs.map((l) => l.needleId));
let added = 0, skipped = [];
for (const { needleName, ...rec } of proposals.accepted) {
	if (have.has(rec.needleId)) continue;
	if (names.get(rec.needleId) !== needleName) { skipped.push(`${rec.needleId} (${needleName} ≠ ${names.get(rec.needleId) ?? 'absent'})`); continue; }
	locs.push(rec); added++;
}
locs.sort((a, b) => a.needleId.localeCompare(b.needleId));
writeFileSync(d('locations.json'), JSON.stringify(locs, null, 1) + '\n');
console.log(`${added} locations added (${locs.length} total).`);
if (skipped.length) console.log(`skipped, the id does not match the name here: ${skipped.join(', ')}`);
