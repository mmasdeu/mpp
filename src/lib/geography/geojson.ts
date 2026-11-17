import type { Dataset } from '../data/types';
/** Needle FeatureCollection. Needles without coordinates are omitted (never invented). */
export function needlesToGeoJSON(d: Dataset): GeoJSON.FeatureCollection<GeoJSON.Point> {
	return {
		type: 'FeatureCollection',
		features: d.needles.filter((n) => n.location).map((n) => ({
			type: 'Feature' as const,
			id: n.id,
			geometry: { type: 'Point' as const, coordinates: [n.location!.longitude, n.location!.latitude] },
			properties: { id: n.id, name: n.name, regionId: n.regionId, sectionId: n.sectionId, accuracy: n.location!.accuracy ?? 'unknown' }
		}))
	};
}
