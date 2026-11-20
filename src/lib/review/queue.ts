import type { Needle, OcrText } from '$lib/data/types';

export interface QueueItem { needle: Needle; score: number; reasons: string[] }

/** Review priority: higher = more likely to contain an extraction error, so it should be looked at first. Pure and testable. */
export function priority(n: Needle, ocr: OcrText | null | undefined): QueueItem {
	let score = 0; const reasons: string[] = [];
	const add = (s: number, r: string) => { score += s; reasons.push(r); };
	if (n.metadata.extractionNote) add(3, 'nota d\'extracció');
	if (!n.semirRef) add(1, 'sense número de Semir');
	if (n.name.trim().length < 5) add(3, 'nom molt curt');
	if (/[^A-Za-zÀ-ÿ'’·.,\- ]/.test(n.name)) add(2, 'caràcters estranys al nom');
	if (/\b(O|Dels|De|Del)\b/.test(n.name)) add(1, 'majúscules irregulars');
	if (!ocr) add(2, 'sense text OCR');
	else {
		if (!ocr.headingFound) add(4, 'capçalera no trobada');
		if (!ocr.endFound) add(2, 'final del text incert');
		if (ocr.meanConf < 80) add(2, 'confiança OCR baixa');
		if (ocr.text.length < 60) add(3, 'text molt curt');
	}
	return { needle: n, score, reasons };
}

export function buildQueue(needles: Needle[], ocr: Record<string, OcrText> | null, done: Set<string>): QueueItem[] {
	return needles.filter((n) => n.metadata.extractionStatus === 'unreviewed' && !done.has(n.id))
		.map((n) => priority(n, ocr?.[n.id])).sort((a, b) => b.score - a.score || a.needle.id.localeCompare(b.needle.id));
}
