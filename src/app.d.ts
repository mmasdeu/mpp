declare global {
	/** true when static/images/book/*.webp existed at build time (see vite.config.ts) */
	const __BOOK_IMAGES__: boolean;
}
export {};
