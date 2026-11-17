import { describe, it, expect } from 'vitest';
import { applyReview, validateDecisions, type Decision } from '../../src/lib/data/review';
import type { Dataset } from '../../src/lib/data/types';

const mk = (id: string, name: string) => ({ id, name, alternativeNames: [], regionId: 'r1', sectionId: 's1', images: [], bookReferences: [{ page: 1, type: 'description' as const }], metadata: { extractionStatus: 'unreviewed' as const, extractionNote: 'x' } });
const base = (): Dataset => ({ regions: [{ id: 'r1', name: 'R', slug: 'r', sectionIds: ['s1'] }],
	sections: [{ id: 's1', regionId: 'r1', name: 'S', order: 1, needleIds: ['a', 'b', 'c', 'd'] }], needles: [mk('a', 'A'), mk('b', 'B'), mk('c', 'C'), mk('d', 'D')] });
const D = (x: Partial<Decision> & Pick<Decision, 'needleId' | 'action'>): Decision => ({ reviewer: 'T', date: '2026-01-01', ...x });

describe('applyReview', () => {
	it('accepts, corrects, rejects and merges without mutating input', () => {
		const d = base();
		const out = applyReview(d, [D({ needleId: 'a', action: 'accept' }), D({ needleId: 'b', action: 'correct', name: 'Bé', semirRef: '9' }),
			D({ needleId: 'c', action: 'reject', reason: 'label' }), D({ needleId: 'd', action: 'merge', mergeInto: 'a', reason: 'same' })]);
		expect(out.needles.map((n) => n.id)).toEqual(['a', 'b']);
		expect(out.sections[0].needleIds).toEqual(['a', 'b']);
		expect(out.needles[0].metadata.extractionStatus).toBe('reviewed');
		expect(out.needles[0].alternativeNames).toEqual(['D']);
		expect(out.needles[1]).toMatchObject({ name: 'Bé', semirRef: '9' });
		expect(d.needles).toHaveLength(4);
		expect(d.needles[1].name).toBe('B');
	});
});
describe('validateDecisions', () => {
	const ids = new Set(['a', 'b', 'c']);
	const msgs = (x: Decision[]) => validateDecisions(x, ids).map((i) => i.message).join('|');
	it('requires reasons, valid targets and uniqueness', () => {
		expect(msgs([D({ needleId: 'z', action: 'accept' })])).toMatch(/unknown needle/);
		expect(msgs([D({ needleId: 'a', action: 'reject' })])).toMatch(/needs a reason/);
		expect(msgs([D({ needleId: 'a', action: 'merge', reason: 'x', mergeInto: 'a' })])).toMatch(/invalid merge target/);
		expect(msgs([D({ needleId: 'a', action: 'accept' }), D({ needleId: 'a', action: 'accept' })])).toMatch(/more than one/);
		expect(msgs([D({ needleId: 'a', action: 'merge', reason: 'x', mergeInto: 'b' }), D({ needleId: 'b', action: 'reject', reason: 'y' })])).toMatch(/itself removed/);
		expect(msgs([D({ needleId: 'a', action: 'correct' })])).toMatch(/without any change/);
		expect(msgs([D({ needleId: 'a', action: 'accept' })])).toBe('');
	});
});
