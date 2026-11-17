import { describe, it, expect } from 'vitest';
import { isImage, isNeedlePage, needlePagePaths, precachePages, stripBase } from '../../src/lib/pwa/policy';

describe('pwa policy', () => {
	it('handles base paths', () => {
		expect(stripBase('/repo/needles/n1/', '/repo')).toBe('/needles/n1/');
		expect(stripBase('/needles/n1/', '')).toBe('/needles/n1/');
		expect(isNeedlePage('/repo/needles/n0001/', '/repo')).toBe(true);
		expect(isNeedlePage('/repo/needles/', '/repo')).toBe(false);
		expect(isNeedlePage('/repo/sections/s01/', '/repo')).toBe(false);
		expect(isImage('/repo/images/panoramas/a.webp', '/repo')).toBe(true);
	});
	it('precaches everything prerendered except needle pages', () => {
		const pages = ['/', '/map/', '/needles/n1/', '/needles/n2/', '/sections/s01/', '/search/'];
		expect(precachePages(pages)).toEqual(['/', '/map/', '/sections/s01/', '/search/']);
	});
	it('builds needle URLs', () => {
		expect(needlePagePaths(['a', 'b'], '/r')).toEqual(['/r/needles/a/', '/r/needles/b/']);
	});
});
