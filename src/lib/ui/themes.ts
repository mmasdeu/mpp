/** Visual styles (the <html data-theme> attribute). The choice is remembered per browser; `fanzine` is the default. */
export const THEMES = [
	{ id: 'fanzine', name: 'Fanzine (punk)' },
	{ id: 'grafit', name: 'Grafit (fosc)' },
	{ id: 'ressenya', name: 'Ressenya (estergit)' },
	{ id: 'maquina', name: "Màquina d'escriure" },
	{ id: 'classic', name: 'Clàssic' }
] as const;
export type ThemeId = (typeof THEMES)[number]['id'];
export const DEFAULT_THEME: ThemeId = 'fanzine';
const KEY = 'mpp-theme';
export const currentTheme = (): ThemeId => {
	const t = typeof document !== 'undefined' ? document.documentElement.dataset.theme : undefined;
	return (THEMES.some((x) => x.id === t) ? t : DEFAULT_THEME) as ThemeId;
};
export const setTheme = (id: ThemeId) => {
	document.documentElement.dataset.theme = id;
	try { localStorage.setItem(KEY, id); } catch { /* private mode: the choice lasts for this page only */ }
};
