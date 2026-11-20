import { biographies } from '$lib/data/biographies';
export const load = async () => ({ list: await biographies() });
