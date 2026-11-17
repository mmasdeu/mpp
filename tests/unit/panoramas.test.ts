import { describe, it, expect } from 'vitest';
import { validatePanoramas } from '../../src/lib/data/panoramas';
import type { ObservationPoint, Panorama } from '../../src/lib/data/types';

const obs: ObservationPoint = { id: 'o1', name: 'Mirador', location: { latitude: 41.6, longitude: 1.8, accuracy: 'approximate', source: 'x' } };
const pano = (over: Partial<Panorama> = {}): Panorama => ({ id: 'p1', title: 'T', filename: 'a.webp', width: 4000, height: 1000, status: 'reviewed', author: 'A', source: 'S', license: 'L', observationPointId: 'o1', annotations: [{ needleId: 'n1', x: 0.5, y: 0.5 }], ...over });
const run = (p: Panorama[], o = [obs], exists = () => true) => validatePanoramas(p, o, new Set(['n1']), exists);
const errors = (p: Panorama[], o = [obs], e = () => true) => run(p, o, e).filter((i) => i.level === 'error').map((i) => i.message).join('|');

describe('validatePanoramas', () => {
	it('accepts a complete panorama', () => expect(errors([pano()])).toBe(''));
	it('rejects annotations to unknown needles or outside the image', () => {
		expect(errors([pano({ annotations: [{ needleId: 'zz', x: 0.5, y: 0.5 }] })])).toMatch(/unknown needle zz/);
		expect(errors([pano({ annotations: [{ needleId: 'n1', x: 1.2, y: 0.5 }] })])).toMatch(/outside the image/);
	});
	it('checks image file, observation point, direction, duplicates', () => {
		expect(errors([pano()], [obs], () => false)).toMatch(/not found/);
		expect(errors([pano({ observationPointId: 'o9' })])).toMatch(/unknown observation point/);
		expect(errors([pano({ viewingDirection: 400 })])).toMatch(/viewingDirection/);
		expect(errors([pano(), pano()])).toMatch(/duplicate panorama/);
	});
	it('only warns about missing provenance', () => {
		const r = run([pano({ license: undefined })]);
		expect(r.some((i) => i.level === 'warning' && /provenance/.test(i.message))).toBe(true);
		expect(r.some((i) => i.level === 'error')).toBe(false);
	});
	it('requires provenance on observation points', () => {
		const bad = { ...obs, location: { ...obs.location, source: '' } };
		expect(errors([], [bad])).toMatch(/lacks provenance/);
	});
});
