import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleEdit } from '../../src/lib/editor/server';
import { applyReview } from '../../src/lib/data/review';
import { applyStructure } from '../../src/lib/data/structure';

let root: string;
const j = (f: string) => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
const call = (method: string, path: string, body: any = {}, q = '') => handleEdit(root, method, path, new URLSearchParams(q), body);
beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'edit-'));
	for (const d of ['data/review', 'data/source']) mkdirSync(join(root, d), { recursive: true });
	const w = (f: string, v: unknown) => writeFileSync(join(root, 'data', f), JSON.stringify(v));
	w('needles.json', [{ id: 'n1', name: 'A', alternativeNames: [], regionId: 'r1', sectionId: 's1', bookReferences: [{ page: 10, type: 'description' }], images: [], metadata: { extractionStatus: 'unreviewed' } },
		{ id: 'n2', name: 'B', alternativeNames: [], regionId: 'r1', sectionId: 's1', bookReferences: [{ page: 11, type: 'description' }], images: [], metadata: { extractionStatus: 'unreviewed' } }]);
	w('sections.json', [{ id: 's1', regionId: 'r1', name: 'S', order: 1, needleIds: ['n1', 'n2'] }]);
	w('regions.json', [{ id: 'r1', name: 'R', slug: 'r', sectionIds: ['s1'] }, { id: 'r2', name: 'R2', slug: 'r2', sectionIds: [] }]);
	w('review/decisions.json', []); w('locations.json', []); w('drawings.json', { n1: [18] }); w('maps.json', { sections: {}, regions: {} });
	w('review/intros.json', { sections: {}, regions: {} }); w('review/structure.json', { sectionRegion: {} });
	writeFileSync(join(root, 'data/source/drawings-manual.csv'), 'page,needle_id,action,reason\n');
});

describe('editor server', () => {
	it('records verify / correct decisions with reviewer and date, validated', () => {
		expect(call('POST', '/decision', { needleId: 'n1', action: 'verify' }).status).toBe(400);          // reviewer required
		expect(call('POST', '/decision', { needleId: 'n1', action: 'verify', reviewer: 'M' }).status).toBe(200);
		expect(call('POST', '/decision', { needleId: 'n1', action: 'reject', reviewer: 'M' }).status).toBe(400); // reason required
		expect(call('POST', '/decision', { needleId: 'n2', action: 'correct', pages: [11, 12], description: 'text', reviewer: 'M' }).status).toBe(200);
		const d = j('review/decisions.json');
		expect(d.map((x: any) => x.action)).toEqual(['verify', 'correct']);
		const out = applyReview({ regions: [], sections: [{ id: 's1', needleIds: ['n1', 'n2'] }], needles: JSON.parse(readFileSync(join(root, 'data/needles.json'), 'utf8')) } as any, d);
		expect(out.needles[0].metadata.extractionStatus).toBe('verified');
		expect(out.needles[1].description).toBe('text');
		expect(out.needles[1].bookReferences.map((b) => b.page)).toEqual([11, 12]);
		expect(call('DELETE', '/decision', {}, 'needleId=n1').status).toBe(200);
		expect(j('review/decisions.json')).toHaveLength(1);
	});
	it('moves a drawing between needles and keeps it in the manual ledger', () => {
		expect(call('POST', '/drawing', { page: 18, from: 'n1', to: 'n2', reviewer: 'M' }).status).toBe(200);
		expect(j('drawings.json')).toEqual({ n2: [18] });
		const csv = readFileSync(join(root, 'data/source/drawings-manual.csv'), 'utf8');
		expect(csv).toContain('18,n1,remove'); expect(csv).toContain('18,n2,add');
		expect(call('POST', '/drawing', { page: 999, to: 'n2' }).status).toBe(400);
		expect(call('POST', '/drawing', { page: 18, to: 'nX' }).status).toBe(400);
	});
	it('edits map pages, locations, intros and structure', () => {
		expect(call('POST', '/map', { page: 11, to: 's1', reviewer: 'M' }).status).toBe(200);
		expect(j('maps.json').sections.s1).toEqual([11]);
		expect(call('POST', '/location', { needleId: 'n1', latitude: 41.6, longitude: 1.8, accuracy: 'verified', reviewer: 'M' }).status).toBe(200);
		expect(j('locations.json')[0].source).toMatch(/^Editor: M/);
		expect(call('POST', '/location', { needleId: 'n1', latitude: 141, longitude: 1.8, accuracy: 'verified', reviewer: 'M' }).status).toBe(400);
		expect(call('POST', '/intro', { kind: 'section', id: 's1', text: ' Text ', reviewer: 'M' }).status).toBe(200);
		expect(j('review/intros.json').sections.s1).toMatchObject({ text: 'Text', status: 'reviewed', reviewer: 'M' });
		expect(call('POST', '/structure', { sectionId: 's1', regionId: 'r2' }).status).toBe(200);
		const d: any = { regions: JSON.parse(readFileSync(join(root, 'data/regions.json'), 'utf8')), sections: JSON.parse(readFileSync(join(root, 'data/sections.json'), 'utf8')), needles: JSON.parse(readFileSync(join(root, 'data/needles.json'), 'utf8')) };
		const moved = applyStructure(d, j('review/structure.json'));
		expect(moved.regions.find((r) => r.id === 'r2')!.sectionIds).toEqual(['s1']); expect(moved.needles[0].regionId).toBe('r2');
		expect(call('POST', '/structure', { sectionId: 's1', regionId: 'r1' }).status).toBe(200);
		expect(j('review/structure.json').sectionRegion).toEqual({});
		expect(existsSync(join(root, 'data/review/structure.json.tmp'))).toBe(false);
	});


});
