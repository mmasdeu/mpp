const STOP = new Set(['el', 'la', 'els', 'les', 'l', 'de', 'del', 'dels', 'd', 'den', 'en', 'o', 'i']);
/** Normalise a Catalan place name for matching: no diacritics, lowercase, no articles/prepositions, sorted tokens. */
export function nameKey(s: string): string {
	return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ').split(' ').filter((t) => t && !STOP.has(t)).sort().join(' ');
}
export interface Candidate { id: string; name: string; alternativeNames?: string[] }
/** Exact normalised-name match. Returns the needle only if exactly one matches; ambiguity or none → null. */
export function matchByName(name: string, needles: Candidate[]): { needle: Candidate | null; reason: 'ok' | 'none' | 'ambiguous' } {
	const k = nameKey(name);
	const hits = needles.filter((n) => [n.name, ...(n.alternativeNames ?? [])].some((x) => nameKey(x) === k));
	return hits.length === 1 ? { needle: hits[0], reason: 'ok' } : { needle: null, reason: hits.length ? 'ambiguous' : 'none' };
}
/** Minimal GPX waypoint reader (<wpt lat lon><name/><ele/>). */
export function parseGpx(xml: string): { name: string; latitude: number; longitude: number; elevation?: number }[] {
	const out = [];
	for (const m of xml.matchAll(/<wpt\s+([^>]*)>([\s\S]*?)<\/wpt>/g)) {
		const lat = /lat="([^"]+)"/.exec(m[1]), lon = /lon="([^"]+)"/.exec(m[1]), nm = /<name>([\s\S]*?)<\/name>/.exec(m[2]), el = /<ele>([^<]+)<\/ele>/.exec(m[2]);
		if (lat && lon && nm) out.push({ name: nm[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim(), latitude: +lat[1], longitude: +lon[1], elevation: el ? +el[1] : undefined });
	}
	return out;
}
/** CSV with header: name|needle_id, latitude, longitude[, elevation]. Comma separated, no quoted commas. */
export function parseCsv(text: string) {
	const [head, ...rows] = text.trim().split(/\r?\n/);
	const cols = head.split(',').map((c) => c.trim().toLowerCase());
	return rows.filter(Boolean).map((r) => {
		const v = r.split(',').map((x) => x.trim()); const g = (k: string) => v[cols.indexOf(k)];
		return { needleId: g('needle_id') || undefined, name: g('name') || undefined, latitude: +g('latitude'), longitude: +g('longitude'), elevation: g('elevation') ? +g('elevation') : undefined };
	});
}

export interface GeoFeature { name: string; altNames: string[]; latitude: number; longitude: number; elevation?: number; osmId?: string }
/** GeoJSON FeatureCollection of Points (e.g. an Overpass Turbo export). Reads name, alt_name (;-separated), name:ca, ele, @id. */
export function parseGeoJson(text: string): GeoFeature[] {
	const out: GeoFeature[] = [];
	for (const f of JSON.parse(text).features ?? []) {
		if (f.geometry?.type !== 'Point') continue;
		const p = f.properties ?? {};
		const name = p.name ?? p['name:ca'];
		if (!name) continue;
		const [lon, lat] = f.geometry.coordinates;
		const alts = [p['name:ca'], ...(p.alt_name ?? '').split(';'), ...(p.old_name ?? '').split(';')].map((x: string) => x?.trim()).filter((x: string) => x && x !== name);
		const ele = parseFloat(p.ele);
		out.push({ name, altNames: [...new Set<string>(alts)], latitude: lat, longitude: lon, elevation: Number.isFinite(ele) ? ele : undefined, osmId: p['@id'] ?? (typeof f.id === 'string' ? f.id : undefined) });
	}
	return out;
}

/** Near matches for human review (never applied automatically): token-set Jaccard similarity on normalised names. */
export function suggest(name: string, needles: Candidate[], n = 3, min = 0.5): { id: string; name: string; score: number }[] {
	const a = new Set(nameKey(name).split(' ').filter(Boolean));
	if (!a.size) return [];
	return needles.map((x) => {
		const b = new Set(nameKey(x.name).split(' ').filter(Boolean));
		const inter = [...a].filter((t) => b.has(t)).length;
		const jaccard = inter / (a.size + b.size - inter);
		// A multi-word query fully contained in a longer name ("Agulla Foradada" ⊂ "Agulla de la Foradada o dels Apòstols") is a plausible match too.
		const contain = a.size >= 2 && b.size >= a.size ? (0.8 * inter) / a.size : 0;
		return { id: x.id, name: x.name, score: Math.round(100 * Math.max(jaccard, contain)) / 100 };
	}).filter((x) => x.score >= min).sort((x, y) => y.score - x.score).slice(0, n);
}
