/**
 * Import coordinates into data/locations.json (overlay; needles.json is never modified).
 * Usage: tsx scripts/import-locations.ts <file.csv|file.gpx|file.geojson> --source "<provenance>" [--accuracy approximate|verified|unknown] [--report unmatched.csv]
 * Matching: needle_id if given, else exact normalised name match; ambiguous/unmatched rows are reported, never guessed.
 * GeoJSON (e.g. Overpass Turbo export): alt_name / name:ca are also tried; the OSM id is appended to the source.
 * --report writes unmatched/ambiguous rows with fuzzy suggestions; fill its needle_id column and re-import it as CSV.
 * Existing records are not overwritten unless the new accuracy is better.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { matchByName, parseCsv, parseGeoJson, parseGpx, suggest } from '../src/lib/geography/matching';
import type { LocationRecord } from '../src/lib/data/merge';

const args = process.argv.slice(2);
const file = args[0];
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const source = opt('--source'); const accuracy = (opt('--accuracy') ?? 'approximate') as LocationRecord['accuracy'];
if (!file || !source) { console.error('usage: import-locations <file.csv|gpx> --source "<provenance>" [--accuracy ...]'); process.exit(2); }
const path = (f: string) => new URL(`../data/${f}`, import.meta.url);
const needles = JSON.parse(readFileSync(path('needles.json'), 'utf8')) as { id: string; name: string; alternativeNames: string[] }[];
const locs = JSON.parse(readFileSync(path('locations.json'), 'utf8')) as LocationRecord[];
const rank = { unknown: 0, approximate: 1, verified: 2 };
const text = readFileSync(file, 'utf8');
type Row = { needleId?: string; name?: string; altNames?: string[]; latitude: number; longitude: number; elevation?: number; osmId?: string };
const rows: Row[] = file.endsWith('.gpx') ? parseGpx(text) : /\.(geo)?json$/.test(file) ? parseGeoJson(text) : parseCsv(text);
const unmatched: Row[] = [];
let added = 0; const report: string[] = [];
for (const r of rows) {
	let id = r.needleId; let by: LocationRecord['matchedBy'] = 'id';
	if (id && !needles.some((n) => n.id === id)) { report.push(`UNKNOWN ID  ${id}`); continue; }
	if (!id) {
		let m = matchByName(r.name ?? '', needles); by = 'name';
		for (const alt of r.altNames ?? []) if (!m.needle && m.reason === 'none') m = matchByName(alt, needles);
		if (!m.needle) {
			const sug = suggest(r.name ?? '', needles);
			report.push(`${m.reason === 'ambiguous' ? 'AMBIGUOUS ' : 'UNMATCHED '} ${r.name}${sug.length ? '  ~ ' + sug.map((x) => `${x.id} ${x.name} (${x.score})`).join('; ') : ''}`);
			unmatched.push(r); continue;
		}
		id = m.needle.id;
	}
	if (!Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) { report.push(`BAD COORDS ${id}`); continue; }
	const i = locs.findIndex((l) => l.needleId === id);
	if (i >= 0 && rank[locs[i].accuracy] >= rank[accuracy]) { report.push(`KEPT EXISTING ${id} (${locs[i].source})`); continue; }
	const rec: LocationRecord = { needleId: id!, latitude: r.latitude, longitude: r.longitude, elevation: r.elevation, accuracy, source: r.osmId ? `${source} [${r.osmId}]` : source, matchedBy: by, ...(r.osmId ? { note: r.osmId } : {}) };
	if (i >= 0) locs[i] = rec; else locs.push(rec);
	added++;
}
locs.sort((a, b) => a.needleId.localeCompare(b.needleId));
writeFileSync(path('locations.json'), JSON.stringify(locs, null, 1) + '\n');
const q = (x: unknown) => { const t = String(x ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
const rep = opt('--report');
if (rep) {
	const head = 'needle_id,name,latitude,longitude,elevation,osm_id,suggestions';
	writeFileSync(rep, [head, ...unmatched.map((r) => ['', r.name, r.latitude, r.longitude, r.elevation, r.osmId, suggest(r.name ?? '', needles).map((x) => `${x.id} ${x.name} (${x.score})`).join('; ')].map(q).join(','))].join('\n') + '\n');
	console.log(`unmatched report: ${rep} (${unmatched.length} rows)`);
}
console.log(`${added} locations written, ${rows.length - added} skipped. Coverage: ${locs.length}/${needles.length} needles.`);
report.forEach((l) => console.log(l));
