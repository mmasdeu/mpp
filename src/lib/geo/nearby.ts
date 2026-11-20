/**
 * «A prop meu»: geometry for the nearby list and the augmented-reality view (pure functions, unit-tested).
 * Angles in degrees; bearings clockwise from true north; elevation angles above the horizontal.
 */
const R = 6371008.8; // mean Earth radius (m)
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export interface LatLon { latitude: number; longitude: number }

/** Great-circle distance in metres. */
export function distance(a: LatLon, b: LatLon): number {
	const dφ = rad(b.latitude - a.latitude), dλ = rad(b.longitude - a.longitude);
	const h = Math.sin(dφ / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dλ / 2) ** 2;
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, 0–360. */
export function bearing(a: LatLon, b: LatLon): number {
	const φ1 = rad(a.latitude), φ2 = rad(b.latitude), dλ = rad(b.longitude - a.longitude);
	const y = Math.sin(dλ) * Math.cos(φ2), x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
	return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Angle above the horizontal of a point dh metres higher at distance d, with Earth curvature and standard refraction (k = 0.13). */
export function elevationAngle(d: number, dh: number): number {
	if (d < 1) return dh >= 0 ? 90 : -90;
	const drop = (d * d) / (2 * R) * (1 - 0.13);
	return deg(Math.atan2(dh - drop, d));
}

/** Signed smallest difference a − b, in (−180, 180]. */
export function angleDiff(a: number, b: number): number {
	const d = (((a - b) % 360) + 540) % 360 - 180;
	return d === -180 ? 180 : d;
}

const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
/** Catalan compass point for a bearing (N, NE, E, SE, S, SO, O, NO). */
export const cardinal = (b: number) => CARD[Math.round((((b % 360) + 360) % 360) / 45) % 8];

/** «350 m», «1,2 km» */
export const formatDistance = (m: number) => (m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 9950 ? 1 : 0).replace('.', ',')} km`);

/**
 * Where the back camera points, from the W3C DeviceOrientation angles (alpha around z, beta around x, gamma around y; Earth frame x = east,
 * y = north, z = up; alpha must be absolute, i.e. 0 when the top of the device points north).
 * heading: compass direction of the camera axis; pitch: its angle above the horizon; roll: how much the screen's "up" is tilted from the
 * vertical, clockwise (degrees), so labels can be kept level. screenAngle: screen.orientation.angle (0 portrait, 90/270 landscape).
 */
export function cameraPose(alpha: number, beta: number, gamma: number, screenAngle = 0): { heading: number; pitch: number; roll: number } {
	const a = rad(alpha), b = rad(beta), g = rad(gamma);
	const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g);
	// back camera = device −z, rotated by R = Rz(alpha)·Rx(beta)·Ry(gamma)
	const e = -ca * sg - sa * sb * cg, n = -sa * sg + ca * sb * cg, u = -cb * cg;
	const heading = (deg(Math.atan2(e, n)) + 360) % 360;
	const pitch = deg(Math.asin(Math.max(-1, Math.min(1, u))));
	// up-components of the device's x (right) and y (top) axes: their ratio is the tilt of the screen about the camera axis
	const xUp = -cb * sg, yUp = sb;
	const roll = deg(Math.atan2(-xUp, yUp)) + screenAngle;   // landscape (angle 90: device turned counter-clockwise) shows the device's right edge as "up"
	return { heading, pitch, roll: ((roll + 540) % 360) - 180 };
}

/**
 * Screen position of a target seen at (targetBearing, targetElevation) from a camera with the given pose and fields of view (degrees),
 * on a w×h viewport. Returns null when it is outside the view (with a margin).
 */
export function project(targetBearing: number, targetElevation: number, pose: { heading: number; pitch: number; roll: number }, fovH: number, fovV: number, w: number, h: number) {
	const dx = angleDiff(targetBearing, pose.heading), dy = targetElevation - pose.pitch;
	const r = rad(pose.roll), rx = dx * Math.cos(r) - dy * Math.sin(r), ry = dx * Math.sin(r) + dy * Math.cos(r);
	const x = w / 2 + (rx / fovH) * w, y = h / 2 - (ry / fovV) * h;
	if (Math.abs(rx) > fovH * 0.6 || Math.abs(ry) > fovV * 0.6) return null;
	return { x, y };
}

/**
 * Keep labels from overlapping: nearer targets keep their place, farther ones are pushed up until they fit.
 * items must be sorted nearest first; returns the y each label is drawn at (the anchor x is kept).
 */
export function declutter(items: { x: number; y: number; w: number; h: number }[], gap = 2): number[] {
	const placed: { x: number; y: number; w: number; h: number }[] = [];
	return items.map((it) => {
		let y = it.y;
		for (let guard = 0; guard < 40; guard++) {
			const hit = placed.find((p) => Math.abs(p.x - it.x) < (p.w + it.w) / 2 + gap && Math.abs(p.y - y) < (p.h + it.h) / 2 + gap);
			if (!hit) break;
			y = hit.y - (hit.h + it.h) / 2 - gap;
		}
		placed.push({ ...it, y });
		return y;
	});
}

/**
 * Line of sight from a viewer to a target over terrain: samples the ground along the straight line (great-circle approximation, fine
 * for a few km) and reports whether it stays below the sight line. `ground` returns the terrain elevation (m) or null when unknown.
 * Heights include Earth curvature and refraction. The last `skip` metres before the target are not checked (the target's own slope,
 * and a 5 m elevation model that rounds off pinnacles), and `tolerance` metres of terrain above the line are allowed.
 */
export async function lineOfSight(from: LatLon, fromHeight: number, to: LatLon, toHeight: number,
	ground: (lat: number, lon: number) => number | null | Promise<number | null>, { step = 60, skip = 40, tolerance = 4 } = {}): Promise<boolean> {
	const d = distance(from, to);
	const n = Math.floor((d - skip) / step);
	for (let i = 1; i <= n; i++) {
		const f = (i * step) / d;
		const g0 = ground(from.latitude + (to.latitude - from.latitude) * f, from.longitude + (to.longitude - from.longitude) * f);
		const g = g0 instanceof Promise ? await g0 : g0;   // synchronous when the elevation tile is already decoded
		if (g === null) continue;
		const s = f * d, line = fromHeight + (toHeight - fromHeight) * f, drop = (s * (d - s)) / (2 * R) * (1 - 0.13);   // curvature bulge between the two ends
		if (g + drop > line + tolerance) return false;
	}
	return true;
}
