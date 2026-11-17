import { browser } from '$app/environment';
import { PAGES } from './policy';

/** Reactive online/offline flag (starts true during prerender). */
export const net = $state({ online: true });
if (browser) {
	net.online = navigator.onLine;
	addEventListener('online', () => (net.online = true));
	addEventListener('offline', () => (net.online = false));
}

/** Fetch every needle page into the pages cache, reporting progress. Aborts cleanly if the network drops. */
export async function downloadAll(version: string, urls: string[], onProgress: (done: number, total: number) => void, signal?: AbortSignal) {
	const cache = await caches.open(PAGES(version));
	let done = 0, i = 0;
	const worker = async () => {
		while (i < urls.length && !signal?.aborted) {
			const u = urls[i++];
			if (!(await cache.match(u))) {
				const res = await fetch(u, { signal });
				if (!res.ok) throw new Error(`${res.status} ${u}`);
				await cache.put(u, res);
			}
			onProgress(++done, urls.length);
		}
	};
	await Promise.all(Array.from({ length: 6 }, worker));
}

export async function clearOfflineContent() {
	for (const k of await caches.keys()) if (k.startsWith('pages-') || k.startsWith('images-')) await caches.delete(k);
}
