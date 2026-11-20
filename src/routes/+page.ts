import { frontTexts } from '$lib/data/front';
export const load = async () => ({ front: await frontTexts() });
