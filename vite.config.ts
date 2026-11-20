import { sveltekit } from '@sveltejs/kit/vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { editMiddleware } from './src/lib/editor/server';

// Book page images are copyrighted and git-ignored (docs/book-pages.md): the UI only shows them when they exist locally at build time.
const bookImages = existsSync(new URL('./static/images/book/p010.webp', import.meta.url));
// The cut-out drawings, maps and panoramas (static/images/drawings/) are in the repository: shown whenever they exist, even without the scans.
const drawingImages = existsSync(new URL('./static/images/drawings/d007.webp', import.meta.url));   // d007: the general map (p. 7)

// `npm run edit` (EDITOR=1, dev server only) turns on the editor: UI in the pages + the write-back API in src/lib/editor/server.ts.
const editor = process.env.EDITOR === '1';
const editApi = { name: 'montserrat-editor-api', apply: 'serve' as const, configureServer(server: any) { server.middlewares.use(editMiddleware(fileURLToPath(new URL('.', import.meta.url)))); } };

export default defineConfig({
	plugins: [sveltekit(), ...(editor ? [editApi] : [])],
	server: editor ? { host: '127.0.0.1' } : undefined,
	define: { __BOOK_IMAGES__: JSON.stringify(bookImages), __DRAWINGS__: JSON.stringify(drawingImages), __EDITOR__: JSON.stringify(editor) },
	test: { include: ['tests/**/*.test.ts'] }
});
