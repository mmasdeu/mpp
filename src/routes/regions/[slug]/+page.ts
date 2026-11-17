import { dataset, getRegion } from '$lib/data/loader';
import { error } from '@sveltejs/kit';
export const entries = () => dataset.regions.map((r) => ({ slug: r.slug }));
export const load = ({ params }) => {
	const region = getRegion(params.slug);
	if (!region) error(404, 'Regió no trobada');
	return { region };
};
