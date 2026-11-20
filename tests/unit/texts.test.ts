import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { buildTexts } from '../../src/lib/data/texts';
import { loadDataset } from '../../scripts/_load';

describe('textos.json', () => {
	const t = buildTexts(fileURLToPath(new URL('../..', import.meta.url)));
	it('lists every needle once, in book order, after its region', () => {
		const ids = t.filter((e) => e.tipus === 'agulla').map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids.length).toBe(loadDataset().needles.length);   // the needles the web shows (after rejections and merges)
		expect(t.findIndex((e) => e.id === 'n0001')).toBeGreaterThan(t.findIndex((e) => e.id === 'r01' || e.id === 's01'));
	});
	it('every entry says its state and where to correct it', () => {
		for (const e of t) { expect(['revisat', 'ocr', 'sense text']).toContain(e.estat); expect(e.web).toMatch(/^\//); }
		expect(t.filter((e) => e.tipus === 'escalador').length).toBeGreaterThan(0);
	});
});
