import type { Dataset, Needle } from './types';
/** Needles that the automatic extraction missed and a reviewer added (data/review/additions.json); they join the raw data before review decisions. */
export function applyAdditions(d: Dataset, additions: Needle[] | undefined): Dataset {
	if (!additions?.length) return d;
	const have = new Set(d.needles.map((n) => n.id));
	const add = additions.filter((a) => !have.has(a.id));
	const page = new Map(d.needles.concat(add).map((n) => [n.id, n.bookReferences?.[0]?.page ?? 0]));
	return {
		...d, needles: [...d.needles, ...add],
		sections: d.sections.map((s) => {
			const ids = [...s.needleIds];
			let pending = add.filter((x) => x.sectionId === s.id);
			while (pending.length) {                                         // an addition may follow another addition: place those whose predecessor is in first
				const inIds = new Set(ids), waiting = new Set(pending.map((p) => p.id));
				const a = pending.find((p) => !p.after || inIds.has(p.after) || !waiting.has(p.after)) ?? pending[0];
				pending = pending.filter((p) => p !== a);
				let at = a.after ? ids.indexOf(a.after) : -1;               // explicit position when known, else by first page
				if (at < 0) ids.forEach((id, i) => { if ((page.get(id) ?? 0) <= (page.get(a.id) ?? 0)) at = i; });
				ids.splice(at + 1, 0, a.id);
			}
			return ids.length === s.needleIds.length ? s : { ...s, needleIds: ids };
		})
	};
}
