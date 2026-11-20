import { describe, expect, it } from 'vitest';
import { applyAdditions } from '../../src/lib/data/additions';
import type { Dataset, Needle } from '../../src/lib/data/types';

const base = { regions: [], sections: [{ id: 's1', needleIds: ['n1'] }], needles: [{ id: 'n1' }] } as unknown as Dataset;
const add = { id: 'n2', sectionId: 's1' } as Needle;
const pg = (id: string, page: number, sectionId = 's1') => ({ id, sectionId, bookReferences: [{ page }] }) as unknown as Needle;
describe('applyAdditions', () => {
	it('appends reviewer-added needles to the dataset and their section, once', () => {
		const out = applyAdditions(base, [add]);
		expect(out.needles.map((n) => n.id)).toEqual(['n1', 'n2']);
		expect(out.sections[0].needleIds).toEqual(['n1', 'n2']);
		expect(applyAdditions(out, [add]).needles).toHaveLength(2);
		expect(applyAdditions(base, [])).toBe(base);
	});
	it('keeps book order inside the section (by first page)', () => {
		const d = { regions: [], sections: [{ id: 's1', needleIds: ['a', 'b'] }], needles: [pg('a', 10), pg('b', 20)] } as unknown as Dataset;
		const out = applyAdditions(d, [pg('x', 30), pg('y', 15)]);
		expect(out.sections[0].needleIds).toEqual(['a', 'y', 'b', 'x']);
	});
});
