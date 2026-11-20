import { describe, it, expect } from 'vitest';
import { PACKS, GLYPH_URLS, isStorable, isTileHost, tileRange, tileUrls } from '../../src/lib/pwa/tiles';

const topo = PACKS.find((p) => p.id === 'topo')!;
const dem = PACKS.find((p) => p.id === 'dem')!;
const at = (t: string, z: number, x: number, y: number) => t.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));

describe('offline map tiles', () => {
	it('lists the tiles of the Montserrat box', () => {
		expect(tileUrls(topo)).toHaveLength(683);
		expect(tileUrls(dem)).toHaveLength(59);
		const r = tileRange(14);
		expect(r.x0).toBeLessThanOrEqual(r.x1);
		expect(tileUrls(topo)[0]).toMatch(/^https:\/\/geoserveis\.icgc\.cat\/.*\/topografic\/MON3857NW\/10\/\d+\/\d+\.png$/);
	});
	it('stores ICGC tiles inside the box only, up to the zoom limits', () => {
		const r = tileRange(15);
		expect(isStorable(at(topo.template, 15, r.x0, r.y0))).toBe(true);
		expect(isStorable(at(topo.template, 15, r.x0 - 5, r.y0))).toBe(false);          // outside the box
		const r18 = tileRange(18);
		expect(isStorable(at(topo.template, 18, r18.x0, r18.y0))).toBe(false);          // beyond z17
		const r15 = tileRange(15);
		expect(isStorable(at(dem.template, 15, r15.x0, r15.y0))).toBe(false);          // DEM beyond z14
		expect(isStorable(GLYPH_URLS[0])).toBe(true);
	});
	it('never stores OpenTopoMap or Mapterhorn', () => {
		expect(isTileHost('https://tile.opentopomap.org/15/16520/12200.png')).toBe(false);
		expect(isTileHost('https://tiles.mapterhorn.com/12/2068/1525.webp')).toBe(false);
		expect(isStorable('https://tile.opentopomap.org/15/16520/12200.png')).toBe(false);
	});
});
