/**
 * Import coordinates into data/locations.json (overlay; needles.json is never modified).
 * Usage: tsx scripts/import-locations.ts <file.csv|file.gpx|file.geojson> --source "<provenance>" [--accuracy approximate|verified|unknown] [--report unmatched.csv]
 * Matching: needle_id if given, else normalised name match (exact beats variants like "A o B"); ambiguous, unmatched or multiply-claimed rows are reported, never guessed.
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
const needles = JSON.parse(readFileSync(path('needles.json'), 'utf8')) as { id: string; name: string; alternativeNames: string[]; semirRef?: string }[];
const locs = JSON.parse(readFileSync(path('locations.json'), 'utf8')) as LocationRecord[];
const rank = { unknown: 0, approximate: 1, verified: 2 };
const text = readFileSync(file, 'utf8');
type Row = { semir?: string; needleId?: string; name?: string; altNames?: string[]; latitude: number; longitude: number; elevation?: number; osmId?: string };
const rows: Row[] = file.endsWith('.gpx') ? parseGpx(text) : /\.(geo)?json$/.test(file) ? parseGeoJson(text) : parseCsv(text);
type Sug = { id: string; name: string; score: number }[];
const unmatched: (Row & { sug: Sug; reason: string })[] = [];
let added = 0; const report: string[] = [];
const noteUnmatched = (r: Row, reason: string, sug: Sug) => {
	unmatched.push({ ...r, sug, reason });
	report.push(`${reason.padEnd(10)} ${r.name}${sug.length ? '  ~ ' + sug.map((x) => `${x.id ? x.id + ' ' : ''}${x.name} (${x.score})`).join('; ') : ''}`);
};
const assign = (r: Row, id: string, by: LocationRecord['matchedBy']) => {
	if (!Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) { report.push(`BAD COORDS ${id}`); return; }
	const i = locs.findIndex((l) => l.needleId === id);
	if (i >= 0 && rank[locs[i].accuracy] >= rank[accuracy]) { report.push(`KEPT EXISTING ${id} (${locs[i].source})`); return; }
	const rec: LocationRecord = { needleId: id, latitude: r.latitude, longitude: r.longitude, elevation: r.elevation, accuracy, source: r.osmId ? `${source} [${r.osmId}]` : source, matchedBy: by, ...(r.osmId ? { note: r.osmId } : {}) };
	if (i >= 0) locs[i] = rec; else locs.push(rec);
	added++;
};
const nameOf = (id: string) => needles.find((n) => n.id === id)!.name;

// Phase 1: classify every row. Rows with a needle_id are assigned directly; name rows become candidates.
const cands = new Map<string, { r: Row; exact: boolean }[]>();
for (const r of rows) {
	if (r.needleId) {
		if (!needles.some((n) => n.id === r.needleId)) report.push(`UNKNOWN ID  ${r.needleId}`);
		else assign(r, r.needleId, 'id');
		continue;
	}
	let m = matchByName(r.name ?? '', needles);
	for (const alt of r.altNames ?? []) if (!m.needle && m.reason === 'none') m = matchByName(alt, needles);
	if (m.needle) { const g = cands.get(m.needle.id) ?? []; g.push({ r, exact: !!m.exact }); cands.set(m.needle.id, g); continue; }
	const bySemir = r.semir ? (needles as any[]).filter((n) => n.semirRef === r.semir).map((n) => ({ id: n.id, name: `${n.name} (Semir ${r.semir})`, score: 1 })) : [];
	noteUnmatched(r, m.reason === 'ambiguous' ? 'AMBIGUOUS' : 'UNMATCHED', [...bySemir, ...suggest(r.name ?? '', needles)]);
}
// Phase 2: exact name matches beat loose ones (variants such as "A o B" or "(Roca 12)"); a needle claimed by several
// candidate rows gets no coordinates automatically, because choosing between them would be a guess.
for (const [id, g] of cands) {
	const exact = g.filter((x) => x.exact), loose = g.filter((x) => !x.exact);
	const pick = exact.length ? exact : loose;
	if (pick.length === 1) {
		assign(pick[0].r, id, 'name');
		if (exact.length) for (const x of loose) noteUnmatched(x.r, 'SUPERSEDED', [{ id, name: `${nameOf(id)} (exact match already used)`, score: 0 }]);
	} else for (const x of g) noteUnmatched(x.r, 'MULTIPLE', [{ id, name: `${nameOf(id)} (${pick.length} OSM nodes match it)`, score: 0 }]);
}
locs.sort((a, b) => a.needleId.localeCompare(b.needleId));
writeFileSync(path('locations.json'), JSON.stringify(locs, null, 1) + '\n');
const q = (x: unknown) => { const t = String(x ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
const rep = opt('--report');
if (rep) {
	const head = 'needle_id,name,latitude,longitude,elevation,osm_id,reason,suggestions';
	writeFileSync(rep, [head, ...unmatched.map((r) => ['', r.name, r.latitude, r.longitude, r.elevation, r.osmId, r.reason, r.sug.map((x) => `${x.id ? x.id + ' ' : ''}${x.name} (${x.score})`).join('; ')].map(q).join(','))].join('\n') + '\n');
	console.log(`unmatched report: ${rep} (${unmatched.length} rows)`);
}
console.log(`${added} locations written, ${rows.length - added} skipped. Coverage: ${locs.length}/${needles.length} needles.`);
report.forEach((l) => console.log(l));
