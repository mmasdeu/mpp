import type { Dataset } from './types';
export interface Issue { level: 'error' | 'warning'; message: string }

export function validate(d: Dataset): Issue[] {
	const out: Issue[] = [];
	const err = (m: string) => out.push({ level: 'error', message: m });
	const warn = (m: string) => out.push({ level: 'warning', message: m });
	const dupes = (kind: string, ids: string[]) => {
		const seen = new Set<string>();
		for (const id of ids) { if (seen.has(id)) err(`duplicate ${kind} id ${id}`); seen.add(id); }
		return seen;
	};
	const rIds = dupes('region', d.regions.map((r) => r.id));
	const sIds = dupes('section', d.sections.map((s) => s.id));
	const nIds = dupes('needle', d.needles.map((n) => n.id));
	const sec = new Map(d.sections.map((s) => [s.id, s]));
	for (const r of d.regions) for (const id of r.sectionIds) {
		if (!sIds.has(id)) err(`region ${r.id}: unknown section ${id}`);
		else if (sec.get(id)!.regionId !== r.id) err(`section ${id} listed in ${r.id} but regionId is ${sec.get(id)!.regionId}`);
	}
	for (const s of d.sections) {
		if (!rIds.has(s.regionId)) err(`section ${s.id}: unknown region ${s.regionId}`);
		for (const id of s.needleIds) if (!nIds.has(id)) err(`section ${s.id}: unknown needle ${id}`);
	}
	const owners = new Map<string, number>();
	for (const s of d.sections) for (const id of s.needleIds) owners.set(id, (owners.get(id) ?? 0) + 1);
	for (const n of d.needles) {
		if (!n.name?.trim()) err(`needle ${n.id}: empty name`);
		const s = sec.get(n.sectionId);
		if (!s) err(`needle ${n.id}: unknown section ${n.sectionId}`);
		else {
			if (s.regionId !== n.regionId) err(`needle ${n.id}: region ${n.regionId} does not match section ${n.sectionId}`);
			if (!s.needleIds.includes(n.id)) err(`needle ${n.id}: not listed in section ${n.sectionId}`);
		}
		if ((owners.get(n.id) ?? 0) > 1) err(`needle ${n.id}: listed in more than one section`);
		if (!n.bookReferences?.length) err(`needle ${n.id}: missing book reference`);
		else {
			const pg = n.bookReferences.map((b) => b.page);
			if (pg.some((p) => !Number.isInteger(p) || p < 1)) err(`needle ${n.id}: invalid book page`);
			else if (pg.some((p, i) => i > 0 && p !== pg[i - 1] + 1)) warn(`needle ${n.id}: book pages are not consecutive (${pg.join(', ')})`);
		}
		const l = n.location;
		if (l) {
			if (!(l.latitude >= -90 && l.latitude <= 90 && l.longitude >= -180 && l.longitude <= 180)) err(`needle ${n.id}: coordinates out of range`);
			// Montserrat massif is near 41.60N, 1.81E
			else if (Math.abs(l.latitude - 41.6) > 0.15 || Math.abs(l.longitude - 1.81) > 0.15) warn(`needle ${n.id}: coordinates far from Montserrat`);
			if (!l.source || !l.accuracy) err(`needle ${n.id}: location lacks provenance (source/accuracy)`);
		}
		if (n.metadata?.extractionStatus === 'unreviewed') warn(`needle ${n.id} (${n.name}): unreviewed`);
		const imgIds = new Set<string>();
		for (const i of n.images) { if (imgIds.has(i.id)) err(`needle ${n.id}: duplicate image ${i.id}`); imgIds.add(i.id); }
	}
	const names = new Map<string, string>();
	for (const n of d.needles) {
		const k = `${n.sectionId}|${n.name.toLowerCase()}`;
		if (names.has(k)) warn(`possible duplicate needle: ${n.id} and ${names.get(k)} (${n.name})`);
		else names.set(k, n.id);
	}
	if (d.regions.length !== 6) warn(`expected 6 regions, found ${d.regions.length}`);
	if (d.sections.length !== 35) warn(`expected 35 sections, found ${d.sections.length}`);
	return out;
}
