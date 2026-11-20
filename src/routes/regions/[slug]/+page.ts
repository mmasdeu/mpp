import { dataset, getRegion } from '$lib/data/loader';
import { error } from '@sveltejs/kit';
import type { Intro } from '$lib/data/types';
import reviewedIntros from '../../../../data/review/intros.json';
import maps from '../../../../data/maps.json';
import bookPanoramas from '../../../../data/book-panoramas.json';
import type { BookPanorama } from '$lib/data/types';

const introFiles = import.meta.glob('../../../../data/ocr/intros.json', { import: 'default' });
const intros = async () => { const f = Object.values(introFiles)[0]; return f ? ((await f()) as Record<string, Record<string, Intro>>) : null; };
const mapPages = (kind: 'sections' | 'regions', id: string): number[] => (maps as Record<string, Record<string, number[]>>)[kind][id] ?? [];
export const entries = () => dataset.regions.map((r) => ({ slug: r.slug }));
export const load = async ({ params }) => {
	const region = getRegion(params.slug);
	if (!region) error(404, 'Regió no trobada');
	return { region, intro: ((reviewedIntros as Record<string, Record<string, Intro>>).regions[region.id] ?? (await intros())?.regions?.[region.id]) ?? null, mapPages: mapPages('regions', region.id), panoramas: (bookPanoramas as BookPanorama[]).filter((x) => x.regionId === region.id) };
};
