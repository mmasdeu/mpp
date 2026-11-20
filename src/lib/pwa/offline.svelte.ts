import { browser } from '$app/environment';
import { PAGES } from './policy';
import { TILES, tileUrls, GLYPH_URLS, type Pack } from './tiles';

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


/** How many tiles of a pack are already stored. */
export async function packStored(p: Pack): Promise<number> {
	const c = await caches.open(TILES);
	const have = new Set((await c.keys()).map((r) => r.url));
	return tileUrls(p).filter((u) => have.has(u)).length;
}

/** Store every tile of a pack (and the label glyphs). Already stored tiles are skipped; returns bytes downloaded. */
export async function downloadPack(p: Pack, onProgress: (done: number, total: number) => void, signal?: AbortSignal): Promise<number> {
	const c = await caches.open(TILES);
	const urls = [...tileUrls(p), ...GLYPH_URLS];
	const have = new Set((await c.keys()).map((r) => r.url));
	let done = 0, i = 0, bytes = 0, failed = 0;
	const worker = async () => {
		while (i < urls.length && !signal?.aborted) {
			const u = urls[i++];
			if (!have.has(u)) {
				try {
					const res = await fetch(u, { mode: 'cors', signal });
					if (res.ok) { const b = await res.blob(); bytes += b.size; await c.put(u, new Response(b, { headers: res.headers })); }
					else if (res.status !== 404) failed++;           // 404: no tile there (outside the service area)
				} catch (e) { if (signal?.aborted) throw e; failed++; }
				if (failed > 20) throw new Error('too many failures');
			}
			onProgress(++done, urls.length);
		}
	};
	await Promise.all(Array.from({ length: 6 }, worker));
	return bytes;
}

export async function clearTiles() { await caches.delete(TILES); }
