import { error } from '@sveltejs/kit';
import { getPanorama, panoramas } from '$lib/data/loader';
export const entries = () => panoramas.map((p) => ({ id: p.id }));
export const load = ({ params }) => {
	const panorama = getPanorama(params.id);
	if (!panorama) error(404, 'Panoràmic no trobat');
	return { panorama };
};
