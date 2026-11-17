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
