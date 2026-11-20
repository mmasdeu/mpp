import { describe, expect, it } from 'vitest';
import { buildQueue } from '../../src/lib/review/queue';
import type { Needle, OcrText } from '../../src/lib/data/types';

const n = (id: string, name: string, extra: Partial<Needle> = {}): Needle => ({ id, name, alternativeNames: [], regionId: 'r', sectionId: 's', semirRef: '1', bookReferences: [], metadata: { extractionStatus: 'unreviewed' }, ...extra } as Needle);
const ocr = (o: Partial<OcrText> = {}): OcrText => ({ text: 'x'.repeat(200), pages: [1], headingFound: true, endFound: true, meanConf: 95, status: 'ocr-unreviewed', ...o });

describe('review queue', () => {
	it('puts suspicious needles first and skips done or reviewed ones', () => {
		const needles = [n('n1', 'El Dau'), n('n2', 'X1'), n('n3', 'La Nina', { metadata: { extractionStatus: 'reviewed' } }), n('n4', 'La Gorra')];
		const q = buildQueue(needles, { n1: ocr(), n2: ocr({ headingFound: false }), n4: ocr() }, new Set(['n4']));
		expect(q.map((x) => x.needle.id)).toEqual(['n2', 'n1']);
		expect(q[0].reasons).toContain('capçalera no trobada');
	});
});
