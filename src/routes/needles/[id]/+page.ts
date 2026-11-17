import { dataset, getNeedle } from '$lib/data/loader';
import { error } from '@sveltejs/kit';
export const entries = () => dataset.needles.map((n) => ({ id: n.id }));
export const load = ({ params }) => {
	const needle = getNeedle(params.id);
	if (!needle) error(404, 'Agulla no trobada');
	return { needle };
};
