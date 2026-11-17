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
