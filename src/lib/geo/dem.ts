/**
 * Ground elevation from the same elevation tiles as the 3D map (ICGC 5 m model, Mapbox terrain-RGB encoding, 256 px tiles), sampled at z14
 * (~7 m per pixel here). Works offline when the «Relleu 3D» pack is downloaded (the service worker serves the tiles from its cache).
 * Returns null when the tile cannot be fetched or decoded.
 */
import { DEMS } from '$lib/components/Map/config';

const Z = 14;
const dem = DEMS[0];
const tiles = new Map<string, Promise<ImageData | null>>();
const ready = new Map<string, ImageData | null>();   // decoded tiles, for synchronous lookups

function tile(x: number, y: number): Promise<ImageData | null> {
	const key = `${x}/${y}`;
	let p = tiles.get(key);
	if (!p) {
		const url = dem.tiles[0].replace('{z}', String(Z)).replace('{x}', String(x)).replace('{y}', String(y));
		p = fetch(url, { mode: 'cors' })
			.then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
			.then((b) => createImageBitmap(b))
			.then((bmp) => {
				const c = new OffscreenCanvas(bmp.width, bmp.height), ctx = c.getContext('2d', { willReadFrequently: true })!;
				ctx.drawImage(bmp, 0, 0);
				return ctx.getImageData(0, 0, bmp.width, bmp.height);
			})
			.catch(() => null);
		p.then((img) => ready.set(key, img));
		tiles.set(key, p);
	}
	return p;
}

function pos(latitude: number, longitude: number) {
	const n = 2 ** Z, lat = (latitude * Math.PI) / 180;
	const fx = ((longitude + 180) / 360) * n, fy = ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n;
	return { fx, fy, tx: Math.floor(fx), ty: Math.floor(fy) };
}
/** Fetch, in parallel, every elevation tile within `radius` metres of a point (so that later lookups are synchronous). */
export async function prefetch(latitude: number, longitude: number, radius: number): Promise<void> {
	if (typeof OffscreenCanvas === 'undefined') return;
	const dLat = radius / 111320, dLon = radius / (111320 * Math.cos((latitude * Math.PI) / 180));
	const a = pos(latitude + dLat, longitude - dLon), b = pos(latitude - dLat, longitude + dLon), jobs: Promise<unknown>[] = [];
	for (let x = a.tx; x <= b.tx; x++) for (let y = a.ty; y <= b.ty; y++) jobs.push(tile(x, y));
	await Promise.all(jobs);
}
/** Synchronous lookup: a number or null when the tile is already decoded, a Promise otherwise (for tight loops such as lines of sight). */
export function elevationFast(latitude: number, longitude: number): number | null | Promise<number | null> {
	const { fx, fy, tx, ty } = pos(latitude, longitude), key = `${tx}/${ty}`;
	return ready.has(key) ? read(ready.get(key)!, fx, fy, tx, ty) : elevationAt(latitude, longitude);
}

export async function elevationAt(latitude: number, longitude: number): Promise<number | null> {
	if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return null;
	const { fx, fy, tx, ty } = pos(latitude, longitude);
	return read(await tile(tx, ty), fx, fy, tx, ty);
}
function read(img: ImageData | null, fx: number, fy: number, tx: number, ty: number): number | null {
	if (!img) return null;
	const px = Math.min(img.width - 1, Math.floor((fx - tx) * img.width)), py = Math.min(img.height - 1, Math.floor((fy - ty) * img.height));
	const i = (py * img.width + px) * 4, d = img.data;
	if (d[i + 3] === 0) return null;   // outside the model's extent
	const h = -10000 + (d[i] * 65536 + d[i + 1] * 256 + d[i + 2]) * 0.1;
	return h > -100 && h < 5000 ? h : null;
}
