import type { Dataset, MergedPart, Needle } from './types';
import type { Issue } from './validation';

/** A human decision about one extracted needle. Stored in data/review/decisions.json; the raw extraction is never edited. */
export interface Decision {
	needleId: string;
	action: 'accept' | 'verify' | 'correct' | 'reject' | 'merge';
	/** correct: replacement values */
	name?: string; alternativeNames?: string[]; semirRef?: string;
	/** correct: reviewed transcription of the needle's text (replaces the unreviewed OCR) */
	description?: string;
	/** correct: the book pages that hold this needle's entry (replaces the extracted page references) */
	pages?: number[];
	/** merge: target needle that absorbs this one (its name becomes an alternative name; its pages and text are added to the target) */
	mergeInto?: string;
	/** correct: the description was written for the merged needle and already includes the text of the entries merged into it */
	mergedText?: boolean;
	/** required for reject and merge */
	reason?: string;
	reviewer: string; date: string;
}

export function applyReview(d: Dataset, decisions: Decision[]): Dataset {
	const by = new Map(decisions.map((x) => [x.needleId, x]));
	const absorbed = new Map<string, Needle[]>();
	for (const x of decisions) if (x.action === 'merge' && x.mergeInto) {
		const src = d.needles.find((n) => n.id === x.needleId);
		if (src) absorbed.set(x.mergeInto, [...(absorbed.get(x.mergeInto) ?? []), src]);
	}
	const gone = new Set(decisions.filter((x) => x.action === 'reject' || x.action === 'merge').map((x) => x.needleId));
	const needles = d.needles.filter((n) => !gone.has(n.id)).map((n): Needle => {
		const x = by.get(n.id);
		let out = n;
		if (x && (x.action === 'accept' || x.action === 'verify' || x.action === 'correct')) {
			out = { ...n, metadata: { ...n.metadata, extractionStatus: x.action === 'verify' ? 'verified' : 'reviewed', lastUpdated: x.date, extractionNote: undefined } };
			if (x.action === 'correct') out = { ...out, name: x.name ?? n.name, alternativeNames: x.alternativeNames ?? n.alternativeNames, semirRef: x.semirRef ?? n.semirRef, description: x.description ?? n.description, bookReferences: x.pages?.length ? x.pages.map((p, i) => n.bookReferences.find((b) => b.page === p) ?? { page: p, type: 'description' as const, ...(i > 0 ? { note: 'pàgina afegida per la revisió' } : {}) }) : n.bookReferences };
		}
		const parts = absorbed.get(n.id) ?? [];
		if (!parts.length) return out;
		// merged entries: their name becomes an alternative name, their pages are added (book order), their text is kept as parts
		const refs = [...out.bookReferences];
		for (const p of parts) for (const b of p.bookReferences) if (!refs.some((r) => r.page === b.page)) refs.push(b);
		refs.sort((a, b) => a.page - b.page);
		const mergedParts: MergedPart[] = parts.map((p) => ({ id: p.id, name: p.name, page: p.bookReferences[0]?.page ?? 0, ...(p.description ? { description: p.description } : {}) }));
		return { ...out, alternativeNames: [...new Set([...out.alternativeNames, ...parts.map((p) => p.name)])], bookReferences: refs, mergedParts,
			...(x?.action === 'correct' && x.mergedText && x.description ? { descriptionIncludesMerged: true } : {}) };
	});
	return { ...d, needles, sections: d.sections.map((s) => ({ ...s, needleIds: s.needleIds.filter((id) => !gone.has(id)) })) };
}

export function validateDecisions(decisions: Decision[], needleIds: Set<string>): Issue[] {
	const out: Issue[] = [];
	const e = (message: string) => out.push({ level: 'error', message });
	const seen = new Set<string>();
	for (const x of decisions) {
		if (!needleIds.has(x.needleId)) e(`decision for unknown needle ${x.needleId}`);
		if (seen.has(x.needleId)) e(`needle ${x.needleId}: more than one decision`);
		seen.add(x.needleId);
		if (!x.reviewer || !x.date) e(`decision ${x.needleId}: missing reviewer/date`);
		if ((x.action === 'reject' || x.action === 'merge') && !x.reason?.trim()) e(`decision ${x.needleId}: ${x.action} needs a reason`);
		if (x.pages && (!x.pages.length || x.pages.some((p) => !Number.isInteger(p) || p < 1 || p > 409))) e(`decision ${x.needleId}: invalid pages`);
		if (x.action === 'correct' && !(x.name?.trim() || x.alternativeNames || x.semirRef || x.description?.trim() || x.pages)) e(`decision ${x.needleId}: correct without any change`);
		if (x.action === 'merge' && (!x.mergeInto || !needleIds.has(x.mergeInto) || x.mergeInto === x.needleId)) e(`decision ${x.needleId}: invalid merge target`);
	}
	for (const x of decisions) if (x.action === 'merge' && x.mergeInto) {
		const t = decisions.find((y) => y.needleId === x.mergeInto);
		if (t && (t.action === 'reject' || t.action === 'merge')) e(`decision ${x.needleId}: merge target ${x.mergeInto} is itself removed`);
	}
	return out;
}
