/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { base, build, files, prerendered, version } from '$service-worker';
import { IMAGES, MAX_IMAGES, NETWORK_TIMEOUT_MS, PAGES, SHELL, isImage, isNeedlePage, precachePages } from '$lib/pwa/policy';

const sw = self as unknown as ServiceWorkerGlobalScope;
const FALLBACK = `${base}/404.html`; // SPA shell: boots the client router, which can render any route from the bundled data
const SHELL_ASSETS = [...build, ...files.filter((f) => !f.startsWith(`${base}/images/`) && !f.endsWith('.map')), ...precachePages(prerendered, base)];

sw.addEventListener('install', (event) => {
	event.waitUntil((async () => {
		const c = await caches.open(SHELL(version));
		await c.addAll(SHELL_ASSETS);
		// The SPA fallback is served with HTTP 404 by hosts (that is its purpose), which addAll() rejects; store it explicitly.
		await c.put(FALLBACK, await fetch(FALLBACK));
		await sw.skipWaiting();
	})());
});

sw.addEventListener('activate', (event) => {
	event.waitUntil((async () => {
		for (const k of await caches.keys()) if (k !== IMAGES && k !== SHELL(version) && k !== PAGES(version)) await caches.delete(k);
		await sw.clients.claim();
	})());
});

async function putCapped(cacheName: string, req: Request, res: Response, max: number) {
	const c = await caches.open(cacheName);
	await c.put(req, res);
	const keys = await c.keys();
	for (const k of keys.slice(0, Math.max(0, keys.length - max))) await c.delete(k); // oldest first
}

async function navigate(req: Request): Promise<Response> {
	const path = new URL(req.url).pathname;
	try {
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), NETWORK_TIMEOUT_MS);
		const res = await fetch(req, { signal: ctrl.signal });
		clearTimeout(timer);
		if (res.ok && isNeedlePage(path, base)) (await caches.open(PAGES(version))).put(req, res.clone());
		return res;
	} catch {
		const hit = await caches.match(req, { ignoreSearch: true });
		if (hit) return hit;
		const shell = await caches.match(FALLBACK);
		// Re-wrap the stored 404 page as a normal 200 so the browser treats it as the page the user asked for.
		return shell ? new Response(shell.body, { status: 200, headers: shell.headers }) : Response.error();
	}
}

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== location.origin) return; // map tiles and other third-party content are never cached (licensing)
	if (req.mode === 'navigate') return void event.respondWith(navigate(req));
	if (isImage(url.pathname, base)) {
		return void event.respondWith((async () => {
			const hit = await caches.match(req);
			if (hit) return hit;
			const res = await fetch(req);
			if (res.ok) event.waitUntil(putCapped(IMAGES, req, res.clone(), MAX_IMAGES));
			return res;
		})());
	}
	event.respondWith(caches.match(req).then((hit) => hit ?? fetch(req)));
});
