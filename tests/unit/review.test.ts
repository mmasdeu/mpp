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
	it('a merge keeps the merged entry\'s pages and text as parts of the target, in book order', () => {
		const d = base();
		d.needles[0] = { ...d.needles[0], bookReferences: [{ page: 5, type: 'description' }] };
		d.needles[3] = { ...d.needles[3], bookReferences: [{ page: 3, type: 'description' }, { page: 4, type: 'description' }], description: 'Text de D' };
		const out = applyReview(d, [D({ needleId: 'd', action: 'merge', mergeInto: 'a', reason: 'via' })]);
		const a = out.needles.find((n) => n.id === 'a')!;
		expect(a.bookReferences.map((b) => b.page)).toEqual([3, 4, 5]);
		expect(a.mergedParts).toEqual([{ id: 'd', name: 'D', page: 3, description: 'Text de D' }]);
		expect(a.descriptionIncludesMerged).toBeUndefined();
		const after = applyReview(d, [D({ needleId: 'd', action: 'merge', mergeInto: 'a', reason: 'via' }), D({ needleId: 'a', action: 'correct', description: 'Tot', mergedText: true })]);
		expect(after.needles.find((n) => n.id === 'a')).toMatchObject({ description: 'Tot', descriptionIncludesMerged: true });
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
describe('alternative names from the index', () => {
	it('adds names without duplicates and ignores unknown ids', async () => {
		const { applyAltNames } = await import('../../src/lib/data/alt-names');
		const d = base();
		const out = applyAltNames(d, { a: ['Correcavalls', 'A', 'correcavalls'], zz: ['X'] });
		expect(out.needles[0].alternativeNames).toEqual(['Correcavalls']);
		expect(d.needles[0].alternativeNames).toEqual([]);
	});
});
describe('automatic fixes', () => {
	it('clean names before review; a reviewer name wins; Semir only when missing', async () => {
		const { applyFixes } = await import('../../src/lib/data/fixes');
		const d = applyFixes(base(), { a: { name: 'A bo', semirRef: '9' }, b: { name: 'B bo' } });
		expect(d.needles[0]).toMatchObject({ name: 'A bo', semirRef: '9' });
		const out = applyReview(d, [D({ needleId: 'b', action: 'correct', name: 'B del revisor' })]);
		expect(out.needles[1].name).toBe('B del revisor');
	});
});
