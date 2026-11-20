import index from '../../../data/review/biographies.json';
export interface Biography { id: string; name: string; pages: number[]; text?: string }
const ocrFiles = import.meta.glob('../../../data/ocr/biographies.json', { import: 'default' });
/** The list of climbers (tracked) with the book text: a reviewer's `text` wins over the raw OCR (git-ignored, so it may be missing). */
export const biographies = async (): Promise<Biography[]> => {
	const f = Object.values(ocrFiles)[0];
	const ocr = f ? ((await f()) as { id: string; text: string }[]) : [];
	return (index as Biography[]).map((b) => ({ ...b, text: b.text ?? ocr.find((o) => o.id === b.id)?.text }));
};
