import { dataset, getSection } from '$lib/data/loader';
import { error } from '@sveltejs/kit';
import type { Section } from '$lib/data/types';

export const entries = () => dataset.sections.map((s) => ({ id: s.id }));

export const load = ({ params }) => {
	const section = getSection(params.id);
	if (!section) error(404, 'Secció no trobada');
	const region = dataset.regions.find((r) => r.id === section.regionId);
	if (!region) error(404, 'Regió no trobada');
	const ordered: Section[] = [...dataset.sections].sort((a, b) => a.order - b.order);
	const i = ordered.findIndex((s) => s.id === section.id);
	const prev = i > 0 ? ordered[i - 1] : null;
	const next = i >= 0 && i < ordered.length - 1 ? ordered[i + 1] : null;
	return { section, region, prev, next };
};
