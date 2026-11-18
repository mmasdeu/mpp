/** Pure caching-policy helpers, shared by the service worker and unit tests. `base` is the deployment sub-path ('' or '/repo'). */
export const stripBase = (path: string, base: string) => (base && path.startsWith(base) ? path.slice(base.length) || '/' : path);
export const isNeedlePage = (path: string, base = '') => /^\/needles\/[^/]+\/?$/.test(stripBase(path, base));
export const isImage = (path: string, base = '') => stripBase(path, base).startsWith('/images/');

/**
 * Pages worth precaching on install: everything prerendered except the per-needle pages, which are cached when visited
 * (or all at once on request from the /offline/ page). Keeps first install small.
 */
export const precachePages = (prerendered: string[], base = ''): string[] => prerendered.filter((p) => !isNeedlePage(p, base));

/** Needle page URLs for the "download everything" action. */
export const needlePagePaths = (ids: string[], base = ''): string[] => ids.map((id) => `${base}/needles/${id}/`);

/** Cache names are versioned so a new deployment drops the old content. */
export const SHELL = (v: string) => `shell-${v}`;
export const PAGES = (v: string) => `pages-${v}`;
export const IMAGES = 'images-v1'; // images are immutable per filename; keep across deployments, capped below
export const MAX_IMAGES = 150; // ~3 book pages per needle at ~65 kB each
export const NETWORK_TIMEOUT_MS = 3500; // on a mountain connection, fall back to cache rather than hang
