import { dataset } from '$lib/data/loader';
import type { OcrText } from '$lib/data/types';

const ocrFiles = import.meta.glob('../../../data/ocr/descriptions.json', { import: 'default' });
export const load = async () => {
	const f = Object.values(ocrFiles)[0];
	const ocr = f ? ((await f()) as Record<string, OcrText>) : null;
	return { needles: dataset.needles, ocr };
};
