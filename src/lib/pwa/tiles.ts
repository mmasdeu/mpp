/**
 * Offline map tiles. Pure helpers shared by the service worker, the /offline/ page and unit tests.
 *
 * Only ICGC services (CC BY 4.0) and the label glyphs are stored; OpenTopoMap's tile policy forbids bulk downloads, so it stays online-only.
 * Everything is limited to a box around the massif, so the cache has a known upper bound.
 */
import { BASEMAPS, DEMS, GLYPHS } from '../components/Map/config';

export const TILES = 'tiles-v1';
/** Montserrat massif plus ~1.5 km of margin: [west, south, east, north]. */
export const OFFLINE_BBOX: [number, number, number, number] = [1.74, 41.565, 1.88, 41.635];

export type Pack = { id: string; label: string; template: string; zmin: number; zmax: number; avgKB: number; note?: string };
const tpl = (id: string) => BASEMAPS.find((b) => b.id === id)!.tiles[0];
export const PACKS: Pack[] = [
	{ id: 'topo', label: 'Mapa topogràfic (ICGC)', template: tpl('topo'), zmin: 10, zmax: 16, avgKB: 30, note: 'recomanat' },
	{ id: 'dem', label: 'Relleu 3D (MDT 5 m, ICGC)', template: DEMS[0].tiles[0], zmin: 8, zmax: 14, avgKB: 230, note: 'necessari per al 3D' },
	{ id: 'topo17', label: 'Mapa topogràfic, màxim detall', template: tpl('topo'), zmin: 17, zmax: 17, avgKB: 30 },
	{ id: 'orto', label: 'Ortofoto (ICGC)', template: tpl('orto'), zmin: 10, zmax: 16, avgKB: 80 }
];
/** Glyph ranges for the label font (Latin + Latin-1, enough for Catalan names). */
export const GLYPH_URLS = ['0-255', '256-511'].map((r) => GLYPHS.replace('{fontstack}', encodeURIComponent('Open Sans Regular,Arial Unicode MS Regular')).replace('{range}', r));

export const lon2x = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
export const lat2y = (lat: number, z: number) => Math.floor(((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);

export function tileRange(z: number, bbox = OFFLINE_BBOX) {
	const [w, s, e, n] = bbox;
	return { x0: lon2x(w, z), x1: lon2x(e, z), y0: lat2y(n, z), y1: lat2y(s, z) };
}
export function tileUrls(p: Pick<Pack, 'template' | 'zmin' | 'zmax'>, bbox = OFFLINE_BBOX): string[] {
	const out: string[] = [];
	for (let z = p.zmin; z <= p.zmax; z++) {
		const r = tileRange(z, bbox);
		for (let x = r.x0; x <= r.x1; x++) for (let y = r.y0; y <= r.y1; y++) out.push(p.template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)));
	}
	return out;
}

const prefix = (t: string) => t.slice(0, t.indexOf('{z}'));
const STORABLE = [...new Set([...BASEMAPS.filter((b) => b.id !== 'otm').map((b) => b.tiles[0]), DEMS[0].tiles[0]])];
const MAXZ: Record<string, number> = Object.fromEntries(STORABLE.map((t) => [prefix(t), t === DEMS[0].tiles[0] ? 14 : 17]));

/**
 * Should the service worker store this response? ICGC tiles inside the box (up to z17, DEM up to z14) and the label glyphs.
 * Tiles elsewhere are only fetched, never stored.
 */
export function isStorable(url: string): boolean {
	if (url.startsWith(GLYPHS.slice(0, GLYPHS.indexOf('{fontstack}')))) return true;
	const p = Object.keys(MAXZ).find((k) => url.startsWith(k));
	if (!p) return false;
	const m = url.slice(p.length).match(/^(\d+)\/(\d+)\/(\d+)\.\w+$/);
	if (!m) return false;
	const [z, x, y] = [+m[1], +m[2], +m[3]];
	if (z > MAXZ[p]) return false;
	const r = tileRange(z);
	return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}
/** Requests the service worker should answer from the tile cache first. */
export const isTileHost = (url: string) => STORABLE.some((t) => url.startsWith(prefix(t))) || url.startsWith(GLYPHS.slice(0, GLYPHS.indexOf('{fontstack}')));
