import type { Dataset, Needle } from './types';
/**
 * Automatic clean-ups of the extracted needles (data/review/fixes.json {needleId: {name?, semirRef?}}): OCR slips and capitalisation in
 * names («Roca Deis Coloms» → «Roca dels Coloms»), Semir numbers read from the headings. Applied to the raw extraction, before the
 * review layers, so a reviewer's own correction always wins and the fiche keeps its review state.
 */
export interface Fix { name?: string; semirRef?: string }
export function applyFixes(d: Dataset, fixes: Record<string, Fix>): Dataset {
	if (!Object.keys(fixes).length) return d;
	return { ...d, needles: d.needles.map((n): Needle => {
		const f = fixes[n.id];
		return f ? { ...n, ...(f.name ? { name: f.name } : {}), ...(f.semirRef && !n.semirRef ? { semirRef: f.semirRef } : {}) } : n;
	}) };
}
