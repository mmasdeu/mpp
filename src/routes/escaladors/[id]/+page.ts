import { biographies } from '$lib/data/biographies';
import index from '../../../../data/review/biographies.json';
import { error } from '@sveltejs/kit';
export const entries = () => (index as { id: string }[]).map((b) => ({ id: b.id }));
export const load = async ({ params }) => {
	const list = await biographies(); const i = list.findIndex((b) => b.id === params.id);
	if (i < 0) error(404, 'Escalador no trobat');
	return { bio: list[i], prev: list[i - 1] ?? null, next: list[i + 1] ?? null };
};
