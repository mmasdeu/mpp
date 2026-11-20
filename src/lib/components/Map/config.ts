/**
 * Map sources. All are free, key-less services; tile URLs for ICGC come from the official MapICGC GL JS library config.
 * None of them is cached for offline use (tile terms + size): offline, the map shows only the needle points.
 */
export type BasemapId = 'topo' | 'orto' | 'otm';
export type Basemap = { id: BasemapId; label: string; tiles: string[]; maxzoom: number; attribution: string };

const ICGC = '© <a href="https://www.icgc.cat/" target="_blank" rel="noopener">Institut Cartogràfic i Geològic de Catalunya</a> (CC BY 4.0)';

export const BASEMAPS: Basemap[] = [
	{ id: 'topo', label: 'Topogràfic (ICGC)', maxzoom: 18, attribution: ICGC,
		tiles: ['https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/topografic/MON3857NW/{z}/{x}/{y}.png'] },
	{ id: 'orto', label: 'Ortofoto (ICGC)', maxzoom: 18, attribution: ICGC,
		tiles: ['https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/orto/MON3857NW/{z}/{x}/{y}.png'] },
	{ id: 'otm', label: 'OpenTopoMap', maxzoom: 17, attribution: '© OpenStreetMap contributors, SRTM | © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)',
		tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'] }
];
export const basemap = (id: string | null | undefined) => BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0];

/** Elevation models for 3D terrain + hillshade. The ICGC 5 m model covers Catalonia; Mapterhorn (30 m, global) is the fallback. */
export type Dem = { id: string; label: string; tiles: string[]; encoding: 'mapbox' | 'terrarium'; tileSize: number; minzoom: number; maxzoom: number; attribution: string };
export const DEMS: Dem[] = [
	// ICGC «contextmaps» terrain-RGB service (512 px tiles); the old tilemaps.icgc.cat/tileserver URL answers 404 since 2026
	{ id: 'icgc5m', label: 'MDT 5 m (ICGC)', tiles: ['https://geoserveis.icgc.cat/servei/catalunya/contextmaps-terreny-5m-rgb/wmts/{z}/{x}/{y}.png'],
		encoding: 'mapbox', tileSize: 512, minzoom: 7, maxzoom: 14, attribution: ICGC },
	{ id: 'mapterhorn', label: 'Mapterhorn (30 m)', tiles: ['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
		encoding: 'terrarium', tileSize: 512, minzoom: 0, maxzoom: 14, attribution: '© <a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">Mapterhorn</a>' }
];

export const GLYPHS = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
/** Montserrat massif, used when no needle has coordinates. */
export const MONTSERRAT_BOUNDS: [[number, number], [number, number]] = [[1.76, 41.575], [1.86, 41.625]];
export const TERRAIN_EXAGGERATION = 1.3;
