// Static file server that mimics GitHub Pages: serves build/ (optionally under BASE_PATH), directory index.html, and
// answers unknown paths with 404.html and HTTP status 404. Used by the e2e tests. Usage: node scripts/serve-static.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root = new URL('../build/', import.meta.url).pathname;
const base = process.env.BASE_PATH ?? '';
const port = +(process.argv[2] ?? 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.geojson': 'application/geo+json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
async function find(pathname) {
	if (base && !pathname.startsWith(base)) return null;
	const rel = normalize(decodeURIComponent(pathname.slice(base.length) || '/')).replace(/^(\.\.[/\\])+/, '');
	for (const c of [join(root, rel), join(root, rel, 'index.html')]) {
		try { if ((await stat(c)).isFile()) return c; } catch {}
	}
	return null;
}
createServer(async (req, res) => {
	const file = await find(new URL(req.url, 'http://x').pathname);
	const target = file ?? join(root, '404.html');
	res.writeHead(file ? 200 : 404, { 'content-type': types[extname(target)] ?? 'application/octet-stream' });
	res.end(await readFile(target));
}).listen(port, () => console.log(`serving build/ on :${port}${base}`));
