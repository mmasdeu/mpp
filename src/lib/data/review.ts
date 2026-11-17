import type { Dataset, Needle } from './types';
import type { Issue } from './validation';

/** A human decision about one extracted needle. Stored in data/review/decisions.json; the raw extraction is never edited. */
export interface Decision {
	needleId: string;
	action: 'accept' | 'correct' | 'reject' | 'merge';
	/** correct: replacement values */
	name?: string; alternativeNames?: string[]; semirRef?: string;
	/** merge: target needle that absorbs this one (its name becomes an alternative name) */
	mergeInto?: string;
	/** required for reject and merge */
	reason?: string;
	reviewer: string; date: string;
}

export function applyReview(d: Dataset, decisions: Decision[]): Dataset {
	const by = new Map(decisions.map((x) => [x.needleId, x]));
	const absorbed = new Map<string, string[]>();
	for (const x of decisions) if (x.action === 'merge' && x.mergeInto) absorbed.set(x.mergeInto, [...(absorbed.get(x.mergeInto) ?? []), d.needles.find((n) => n.id === x.needleId)?.name ?? '']);
	const gone = new Set(decisions.filter((x) => x.action === 'reject' || x.action === 'merge').map((x) => x.needleId));
	const needles = d.needles.filter((n) => !gone.has(n.id)).map((n): Needle => {
		const x = by.get(n.id);
		let out = n;
		if (x && (x.action === 'accept' || x.action === 'correct')) {
			out = { ...n, metadata: { ...n.metadata, extractionStatus: 'reviewed', lastUpdated: x.date, extractionNote: undefined } };
			if (x.action === 'correct') out = { ...out, name: x.name ?? n.name, alternativeNames: x.alternativeNames ?? n.alternativeNames, semirRef: x.semirRef ?? n.semirRef };
		}
		const extra = (absorbed.get(n.id) ?? []).filter(Boolean);
		return extra.length ? { ...out, alternativeNames: [...new Set([...out.alternativeNames, ...extra])] } : out;
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
		if (x.action === 'correct' && !(x.name?.trim() || x.alternativeNames || x.semirRef)) e(`decision ${x.needleId}: correct without any change`);
		if (x.action === 'merge' && (!x.mergeInto || !needleIds.has(x.mergeInto) || x.mergeInto === x.needleId)) e(`decision ${x.needleId}: invalid merge target`);
	}
	for (const x of decisions) if (x.action === 'merge' && x.mergeInto) {
		const t = decisions.find((y) => y.needleId === x.mergeInto);
		if (t && (t.action === 'reject' || t.action === 'merge')) e(`decision ${x.needleId}: merge target ${x.mergeInto} is itself removed`);
	}
	return out;
}
