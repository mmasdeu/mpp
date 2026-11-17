import type { Needle } from '../data/types';
import { nameKey } from '../geography/matching';

// Same stopword list as geography/matching.ts (not exported there), kept in order here.
const STOP = new Set(['el', 'la', 'els', 'les', 'l', 'de', 'del', 'dels', 'd', 'den', 'en', 'o', 'i']);

/** Ordered normalised tokens: no diacritics, lowercase, no articles/prepositions. */
function tokens(s: string): string[] {
	return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ').split(' ').filter((t) => t && !STOP.has(t));
}

const RANK_EXACT = 0, RANK_STARTS = 1, RANK_OTHER = 2;

/**
 * Free-text needle search. Every query token must be a (sub)string of some token of the
 * needle's name, alternative names or Semir reference. Results: exact name, then name
 * starting with the query, then the rest; alphabetical within each group.
 */
export function searchNeedles(needles: Needle[], query: string): Needle[] {
	const q = tokens(query);
	if (!q.length) return [];
	const qJoined = q.join(' ');
	const qKey = nameKey(query);
	const scored: { needle: Needle; rank: number }[] = [];
	for (const n of needles) {
		const fields = [n.name, ...(n.alternativeNames ?? []), ...(n.semirRef ? [n.semirRef] : [])];
		const pool = fields.flatMap(tokens);
		if (!q.every((qt) => pool.some((t) => t.includes(qt)))) continue;
		const rank = nameKey(n.name) === qKey ? RANK_EXACT
			: tokens(n.name).join(' ').startsWith(qJoined) ? RANK_STARTS : RANK_OTHER;
		scored.push({ needle: n, rank });
	}
	return scored
		.sort((a, b) => a.rank - b.rank || a.needle.name.localeCompare(b.needle.name, 'ca'))
		.map((x) => x.needle);
}
