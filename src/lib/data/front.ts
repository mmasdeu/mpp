import front from '../../../data/front.json';
import reviewed from '../../../data/review/front.json';

/** Front matter of the book shown on the home page (data/front.json): texts (OCR in data/ocr/front.json, git-ignored; a reviewed
 *  transcription in data/review/front.json wins) and the general map. */
export interface FrontEntry { id: string; title: string; pages: number[]; author?: string; kind?: 'map' | 'index'; note?: string }
export interface FrontText extends FrontEntry { text: string | null; reviewed: boolean }
const ocrFiles = import.meta.glob('../../../data/ocr/front.json', { import: 'default' });

export async function frontTexts(): Promise<FrontText[]> {
	const f = Object.values(ocrFiles)[0];
	const ocr = f ? ((await f()) as Record<string, { text: string }>) : {};
	const rev = reviewed as Record<string, { text: string }>;
	return (front as FrontEntry[]).filter((e) => !e.kind)
		.map((e) => ({ ...e, text: rev[e.id]?.text ?? ocr[e.id]?.text ?? null, reviewed: !!rev[e.id] }));
}
