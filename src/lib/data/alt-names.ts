import type { Dataset, Needle } from './types';
/**
 * Extra alternative names (data/review/alt-names.json {needleId: [names]}), e.g. the other names the book's index («Nomenclàtor»)
 * gives a needle. Added after the review layers, without duplicates; unknown or merged-away ids are ignored.
 */
export function applyAltNames(d: Dataset, extra: Record<string, string[]>): Dataset {
	if (!Object.keys(extra).length) return d;
	const key = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
	return { ...d, needles: d.needles.map((n): Needle => {
		const add = extra[n.id];
		if (!add?.length) return n;
		// already there: the name, its «X o Y» parts and the alternative names
		const have = new Set([n.name, ...n.name.split(/\s+o\s+/i), ...n.alternativeNames].map(key));
		const fresh = add.filter((a) => !have.has(key(a)) && have.add(key(a)));
		return fresh.length ? { ...n, alternativeNames: [...n.alternativeNames, ...fresh] } : n;
	}) };
}
