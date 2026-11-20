declare global {
	/** true when static/images/book/*.webp existed at build time (see vite.config.ts) */
	const __BOOK_IMAGES__: boolean;
	/** the cut-out drawings/maps/panoramas (static/images/drawings/) exist at build time */
	const __DRAWINGS__: boolean;
	/** true only with `npm run edit`: the editor UI and its write-back API (never in the static build) */
	const __EDITOR__: boolean;
}
export {};
