import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validate } from '../../src/lib/data/validation';
import { needlesToGeoJSON } from '../../src/lib/geography/geojson';
import type { Dataset } from '../../src/lib/data/types';
const rd = (f: string) => JSON.parse(readFileSync(new URL(`../../data/${f}.json`, import.meta.url), 'utf8'));
const real = (): Dataset => ({ regions: rd('regions'), sections: rd('sections'), needles: rd('needles') });

describe('canonical data', () => {
	it('has no validation errors and the book structure (6 regions, 35 sections)', () => {
		const d = real();
		expect(validate(d).filter((i) => i.level === 'error')).toEqual([]);
		expect(d.regions).toHaveLength(6);
		expect(d.sections).toHaveLength(35);
	});
});
describe('validate()', () => {
	it('detects broken relationships and bad coordinates', () => {
		const d = real();
		d.needles[0].sectionId = 's99';
		d.needles[1].location = { latitude: 120, longitude: 1.8, accuracy: 'approximate', source: 'x' };
		d.needles[2].location = { latitude: 41.6, longitude: 1.8 };
		d.needles.push({ ...d.needles[3] });
		const msgs = validate(d).filter((i) => i.level === 'error').map((i) => i.message).join('\n');
		expect(msgs).toMatch(/unknown section s99/);
		expect(msgs).toMatch(/out of range/);
		expect(msgs).toMatch(/lacks provenance/);
		expect(msgs).toMatch(/duplicate needle id/);
	});
});
describe('GeoJSON', () => {
	it('omits needles without coordinates and keeps IDs', () => {
		const d = real();
		d.needles[0].location = { latitude: 41.6, longitude: 1.81, accuracy: 'approximate', source: 'test' };
		const fc = needlesToGeoJSON(d);
		expect(fc.features).toHaveLength(1);
		expect(fc.features[0].properties?.id).toBe(d.needles[0].id);
	});
});
