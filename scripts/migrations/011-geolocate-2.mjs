#!/usr/bin/env node
// Migration 011: coordinates for the 38 entries added since migration 004 (Talaies, numbered rocks and cotes matched by Semir number in OSM, caves) plus
// Pou de la Costa Dreta (ICGC «Avenc de la Costa Dreta»), proposed by scripts/geolocate.py from the ICGC 1:5.000 toponymy
// (CC BY 4.0) and OpenStreetMap (ODbL), each checked against the needles already located in its section.
// Reads 011-proposals.json (copy of data/source/geolocation/geolocate-proposals.json). Adds a record only when the needle exists with the same name and has
// no location yet, so your own edits are never overwritten. Idempotent.
// Usage: node scripts/migrations/011-geolocate-2.mjs [projectRoot]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(process.argv[2] ?? new URL('../..', import.meta.url).pathname), d = (f) => join(root, 'data', f);
const rd = (f, dflt) => (existsSync(d(f)) ? JSON.parse(readFileSync(d(f), 'utf8')) : dflt);
const proposals = JSON.parse(readFileSync(new URL('./011-proposals.json', import.meta.url), 'utf8'));      // copy of data/source/geolocation/geolocate-proposals.json at the time
const names = new Map([...rd('needles.json', []), ...rd('review/additions.json', [])].map((n) => [n.id, n.name]));
const locs = rd('locations.json', []);
const have = new Set(locs.map((l) => l.needleId));
proposals.accepted.push({ needleId: 'n0656', needleName: 'Pou de la Costa Dreta', latitude: 41.5810364, longitude: 1.8246392, accuracy: 'approximate',
	source: 'Institut Cartogràfic i Geològic de Catalunya, toponímia 1:5.000 (CC BY 4.0)', matchedBy: 'name', note: 'Avenc de la Costa Dreta — mateix indret (el llibre: «Pou … (Avenc)»); a 182 m del serrat del Penitent' });
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
