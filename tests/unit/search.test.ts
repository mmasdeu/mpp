import { describe, it, expect } from 'vitest';
import { searchNeedles } from '../../src/lib/search/search';
import type { Needle } from '../../src/lib/data/types';

const mk = (id: string, name: string, extra: Partial<Needle> = {}): Needle => ({
	id, name, alternativeNames: [], regionId: 'r1', sectionId: 's1', images: [], bookReferences: [],
	metadata: { extractionStatus: 'reviewed' }, ...extra
});
const needles: Needle[] = [
	mk('a', 'Agulla de la Foradada', { semirRef: '17' }),
	mk('b', 'Agulla Sarda', { alternativeNames: ['Sant Jeroni Petit'] }),
	mk('c', 'Foradada del Bisbe'),
	mk('d', 'Campanar de Sant Jeroni', { semirRef: '4' }),
	mk('e', 'Agulla'),
];

describe('searchNeedles', () => {
	it('matches accent-insensitively and ignores articles', () => {
		expect(searchNeedles(needles, 'agulla foradada').map((n) => n.id)).toEqual(['a']);
		expect(searchNeedles(needles, 'AGULLA DE LA FORADADA').map((n) => n.id)).toEqual(['a']);
	});

	it('finds needles by alternative names', () => {
		expect(searchNeedles(needles, 'petit').map((n) => n.id)).toEqual(['b']);
	});

	it('returns nothing for a blank query', () => {
		expect(searchNeedles(needles, '')).toEqual([]);
		expect(searchNeedles(needles, '   ')).toEqual([]);
	});

	it('ranks exact name, then name prefix, then others, alphabetically within groups', () => {
		expect(searchNeedles(needles, 'agulla').map((n) => n.id)).toEqual(['e', 'a', 'b']);
		expect(searchNeedles(needles, 'foradada').map((n) => n.id)).toEqual(['c', 'a']);
	});

	it('finds needles by Semir reference', () => {
		expect(searchNeedles(needles, '17').map((n) => n.id)).toEqual(['a']);
	});
});
