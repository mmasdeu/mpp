import type { Needle } from '$lib/data/types';
import { bearing, distance, elevationAngle } from '$lib/geo/nearby';

/** A located needle as seen from the user's position. dh: height difference (m) when both elevations are known. */
export interface Target { id: string; name: string; regionId: string; distance: number; bearing: number; dh: number | null; elevationAngle: number }

/**
 * Located needles seen from `here`, nearest first. Elevations: the needle's own (from the data) or the elevation model (`dem`, filled in
 * asynchronously by the page); the user's from the model or the GPS. Without both, the target is drawn on the horizon.
 */
export function targetsFrom(needles: Needle[], here: { latitude: number; longitude: number }, userElevation: number | null, dem: Record<string, number>): Target[] {
	return needles
		.filter((n) => n.location)
		.map((n) => {
			const l = n.location!, d = distance(here, l);
			const ele = l.elevation ?? dem[n.id] ?? null;
			const dh = ele !== null && userElevation !== null ? ele - userElevation : null;
			return { id: n.id, name: n.name, regionId: n.regionId, distance: d, bearing: bearing(here, l), dh, elevationAngle: dh === null ? 0 : elevationAngle(d, dh) };
		})
		.sort((a, b) => a.distance - b.distance);
}
