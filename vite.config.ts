import { sveltekit } from '@sveltejs/kit/vite';
import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Book page images are copyrighted and git-ignored (docs/book-pages.md): the UI only shows them when they exist locally at build time.
const bookImages = existsSync(new URL('./static/images/book/p010.webp', import.meta.url));

export default defineConfig({
	plugins: [sveltekit()],
	define: { __BOOK_IMAGES__: JSON.stringify(bookImages) },
	test: { include: ['tests/**/*.test.ts'] }
});
