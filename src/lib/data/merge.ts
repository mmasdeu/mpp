import type { Dataset, Needle } from './types';
export interface LocationRecord {
	needleId: string; latitude: number; longitude: number; elevation?: number;
	accuracy: 'verified' | 'approximate' | 'unknown'; source: string;
	matchedBy: 'id' | 'name'; note?: string;
}
/** Overlay coordinates (data/locations.json) onto needles; the needle records themselves stay untouched on disk. */
export function applyLocations(d: Dataset, locs: LocationRecord[]): Dataset {
	const by = new Map(locs.map((l) => [l.needleId, l]));
	return { ...d, needles: d.needles.map((n): Needle => {
		const l = by.get(n.id);
		return l ? { ...n, location: { latitude: l.latitude, longitude: l.longitude, elevation: l.elevation, accuracy: l.accuracy, source: l.source } } : n;
	}) };
}
