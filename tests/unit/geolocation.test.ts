import { describe, it, expect } from 'vitest';
import { nameKey, matchByName, parseGpx, parseCsv } from '../../src/lib/geography/matching';
import { applyLocations } from '../../src/lib/data/merge';
import { validate } from '../../src/lib/data/validation';
import type { Dataset } from '../../src/lib/data/types';

const ns = [{ id: 'n1', name: 'Agulla de la Foradada' }, { id: 'n2', name: 'La Cadireta', alternativeNames: ['Roca del Centellar'] }, { id: 'n3', name: 'Agulla Pelada' }, { id: 'n4', name: 'Agulla Pelada' }];
describe('name matching', () => {
	it('ignores case, accents, articles and word order', () => {
		expect(nameKey("L'Agulla DE la Foradada")).toBe(nameKey('foradada agulla'));
	});
	it('matches uniquely, via alternative names, and refuses ambiguity', () => {
		expect(matchByName('Agulla de la Foradada', ns).needle?.id).toBe('n1');
		expect(matchByName('Roca del Centellar', ns).needle?.id).toBe('n2');
		expect(matchByName('Agulla Pelada', ns).reason).toBe('ambiguous');
		expect(matchByName('El Dumbo', ns).reason).toBe('none');
	});
});
describe('parsers', () => {
	it('reads GPX waypoints', () => {
		const w = parseGpx('<gpx><wpt lat="41.6" lon="1.81"><ele>900</ele><name>La Cadireta</name></wpt></gpx>');
		expect(w).toEqual([{ name: 'La Cadireta', latitude: 41.6, longitude: 1.81, elevation: 900 }]);
	});
	it('reads CSV', () => {
		expect(parseCsv('name,latitude,longitude\nEl Dau,41.6,1.8')[0]).toMatchObject({ name: 'El Dau', latitude: 41.6 });
	});
});
describe('applyLocations + validation', () => {
	it('overlays coordinates and keeps provenance mandatory', () => {
		const d: Dataset = { regions: [{ id: 'r1', name: 'R', slug: 'r', sectionIds: ['s1'] }], sections: [{ id: 's1', regionId: 'r1', name: 'S', order: 1, needleIds: ['n1'] }],
			needles: [{ id: 'n1', name: 'X', alternativeNames: [], regionId: 'r1', sectionId: 's1', images: [], bookReferences: [{ page: 1, type: 'description' }], metadata: { extractionStatus: 'reviewed' } }] };
		const m = applyLocations(d, [{ needleId: 'n1', latitude: 41.6, longitude: 1.81, accuracy: 'approximate', source: 'test', matchedBy: 'id' }]);
		expect(m.needles[0].location?.source).toBe('test');
		expect(d.needles[0].location).toBeUndefined();
		expect(validate(m).filter((i) => i.level === 'error')).toEqual([]);
	});
});

import { parseGeoJson, suggest } from '../../src/lib/geography/matching';
describe('GeoJSON import', () => {
	const fc = JSON.stringify({ type: 'FeatureCollection', features: [
		{ type: 'Feature', id: 'node/1', properties: { '@id': 'node/1', name: 'La Cadireta', alt_name: 'Roca del Centellar;Altra', ele: '905' }, geometry: { type: 'Point', coordinates: [1.81, 41.6] } },
		{ type: 'Feature', properties: { name: 'Camí' }, geometry: { type: 'LineString', coordinates: [[1, 1], [2, 2]] } },
		{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [1.8, 41.6] } }] });
	it('keeps named points only, with alt names, elevation and OSM id', () => {
		expect(parseGeoJson(fc)).toEqual([{ name: 'La Cadireta', altNames: ['Roca del Centellar', 'Altra'], latitude: 41.6, longitude: 1.81, elevation: 905, osmId: 'node/1' }]);
	});
	it('suggests near matches without applying them', () => {
		const s = suggest('Agulla Foradada', [{ id: 'n1', name: 'Agulla de la Foradada' }, { id: 'n2', name: 'Agulla Pelada' }]);
		expect(s[0]).toMatchObject({ id: 'n1', score: 1 });
		expect(s.some((x) => x.id === 'n2')).toBe(false);
	});
});
