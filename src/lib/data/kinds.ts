import type { Dataset, Needle } from './types';
export type Kind = NonNullable<Needle['kind']>;
export const KIND_LABEL: Record<Kind, string> = { cova: 'Cova', avenc: 'Avenc' };
/** Marks existing entries as caves/pits (data/review/kinds.json {needleId: kind}); new entries carry `kind` themselves (additions.json). */
export function applyKinds(d: Dataset, kinds: Record<string, string>): Dataset {
	if (!Object.keys(kinds).length) return d;
	return { ...d, needles: d.needles.map((n): Needle => (kinds[n.id] ? { ...n, kind: kinds[n.id] as Kind } : n)) };
}
