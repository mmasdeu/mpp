/** Region colours (kept in sync with --r01…--r06 in app.css); used by the map and by list dots. */
export const REGION_COLORS: Record<string, string> = {
	r01: '#c2410c', r02: '#0f766e', r03: '#7c3aed', r04: '#b45309', r05: '#2563eb', r06: '#be185d'
};
export const regionColor = (id: string | undefined) => (id && REGION_COLORS[id]) || '#b4532a';
