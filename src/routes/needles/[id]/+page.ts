import { dataset, getNeedle } from '$lib/data/loader';
import type { OcrText } from '$lib/data/types';
import drawingsByNeedle from '../../../../data/drawings.json';
import { error } from '@sveltejs/kit';

// Unreviewed OCR text lives in a git-ignored file (copyrighted book text). The glob is empty when the file does not exist,
// and lazy so the text is a separate chunk instead of part of the main bundle.
const ocrFiles = import.meta.glob('../../../../data/ocr/descriptions.json', { import: 'default' });

/** One piece of the book text shown on a needle page: the needle's own entry, or an entry merged into it. */
export interface TextPart { id: string; name: string; page: number; own: boolean; description?: string; ocr: OcrText | null }

export const entries = () => dataset.needles.map((n) => ({ id: n.id }));
export const load = async ({ params }) => {
	const needle = getNeedle(params.id);
	if (!needle) error(404, 'Agulla no trobada');
	const loadAll = Object.values(ocrFiles)[0];
	const all = loadAll ? ((await loadAll()) as Record<string, OcrText>) : {};
	const ocr: OcrText | null = all[needle.id] ?? null;
	const byNeedle = drawingsByNeedle as Record<string, number[]>;
	const merged = needle.mergedParts ?? [];
	// a merged needle shows its own drawings and those of the entries merged into it
	const drawings: number[] = [...new Set([...(byNeedle[needle.id] ?? []), ...merged.flatMap((p) => byNeedle[p.id] ?? [])])];
	// the texts in book order (own entry + merged entries), unless a reviewed description already covers them all
	const own: TextPart = { id: needle.id, name: needle.name, page: (ocr?.pages[0] ?? needle.bookReferences.find((b) => !b.note)?.page ?? needle.bookReferences[0].page), own: true, description: needle.description, ocr };
	const parts: TextPart[] = merged.length && !needle.descriptionIncludesMerged
		? [own, ...merged.map((p) => ({ id: p.id, name: p.name, page: all[p.id]?.pages[0] ?? p.page, own: false, description: p.description, ocr: all[p.id] ?? null }))].sort((a, b) => a.page - b.page || (a.own ? -1 : 1))
		: [];
	return { needle, ocr, drawings, parts };
};
