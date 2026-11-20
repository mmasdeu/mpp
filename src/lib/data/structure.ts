import type { Dataset } from './types';
/** Overlay (data/review/structure.json): move a section to another region when the extracted index got it wrong. */
export interface Structure { sectionRegion: Record<string, string> }
export function applyStructure(d: Dataset, st: Structure | undefined): Dataset {
	const ov = st?.sectionRegion ?? {};
	if (!Object.keys(ov).length) return d;
	const sections = d.sections.map((s) => (ov[s.id] ? { ...s, regionId: ov[s.id] } : s));
	const region = new Map(sections.map((s) => [s.id, s.regionId]));
	return {
		...d, sections,
		regions: d.regions.map((r) => ({ ...r, sectionIds: sections.filter((s) => s.regionId === r.id).sort((a, b) => a.order - b.order).map((s) => s.id) })),
		needles: d.needles.map((n) => (region.get(n.sectionId) && region.get(n.sectionId) !== n.regionId ? { ...n, regionId: region.get(n.sectionId)! } : n))
	};
}
