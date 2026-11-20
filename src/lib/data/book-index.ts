/**
 * What the web holds for each page of the book: needles described there (or continuing there), drawings, section and region
 * introductions and maps, region panoramas, climbers' biographies and the front matter. Used by the book browser (/llibre/).
 */
import { dataset } from './loader';
import drawings from '../../../data/drawings.json';
import maps from '../../../data/maps.json';
import panoramas from '../../../data/book-panoramas.json';
import bios from '../../../data/review/biographies.json';
import front from '../../../data/front.json';

export const BOOK_PAGES = 409;

export interface PageItem {
	kind: 'agulla' | 'dibuix' | 'secció' | 'regió' | 'mapa' | 'panoràmica' | 'escalador' | 'llibre';
	id: string;
	name: string;
	/** link, relative to the site base */
	href: string;
	/** the entry starts on this page (false: it only continues here) */
	starts: boolean;
	regionId?: string;
}

const byPage = new Map<number, PageItem[]>();
const add = (p: number, it: PageItem) => {
	const l = byPage.get(p) ?? [];
	if (!l.some((x) => x.kind === it.kind && x.id === it.id)) l.push(it);
	byPage.set(p, l);
};
const regionSlug = (id: string) => dataset.regions.find((r) => r.id === id)?.slug ?? '';

for (const f of front as { id: string; title: string; pages: number[]; kind?: string }[]) {
	if (f.kind === 'index') continue;
	f.pages.forEach((p, i) => add(p, { kind: f.kind === 'map' ? 'mapa' : 'llibre', id: f.id, name: f.title, href: '/', starts: i === 0 }));
}
for (const r of dataset.regions) {
	if (r.bookReference?.pageStart) add(r.bookReference.pageStart, { kind: 'regió', id: r.id, name: `Regió ${r.name}`, href: `/regions/${r.slug}/`, starts: true, regionId: r.id });
	for (const p of (maps as Record<string, Record<string, number[]>>).regions[r.id] ?? []) add(p, { kind: 'mapa', id: r.id, name: `Plànol de la regió ${r.name}`, href: `/regions/${r.slug}/`, starts: true, regionId: r.id });
}
for (const s of dataset.sections) {
	if (s.bookReference?.pageStart) add(s.bookReference.pageStart, { kind: 'secció', id: s.id, name: `Secció ${s.order}: ${s.name}`, href: `/sections/${s.id}/`, starts: true, regionId: s.regionId });
	for (const p of (maps as Record<string, Record<string, number[]>>).sections[s.id] ?? []) add(p, { kind: 'mapa', id: s.id, name: `Plànol de la secció ${s.order}: ${s.name}`, href: `/sections/${s.id}/`, starts: true, regionId: s.regionId });
}
for (const pano of panoramas as { id: string; regionId: string; title: string; pages: number[] }[])
	for (const p of pano.pages) add(p, { kind: 'panoràmica', id: pano.id, name: pano.title, href: `/regions/${regionSlug(pano.regionId)}/`, starts: true, regionId: pano.regionId });
const drawn = drawings as Record<string, number[]>;
for (const n of dataset.needles) {
	n.bookReferences.forEach((b, i) => add(b.page, { kind: 'agulla', id: n.id, name: n.name, href: `/needles/${n.id}/`, starts: i === 0 || !b.note, regionId: n.regionId }));
	for (const p of drawn[n.id] ?? []) add(p, { kind: 'dibuix', id: n.id, name: n.name, href: `/needles/${n.id}/`, starts: true, regionId: n.regionId });
}
for (const b of bios as { id: string; name: string; pages: number[] }[])
	b.pages.forEach((p, i) => add(p, { kind: 'escalador', id: b.id, name: b.name, href: `/escaladors/${b.id}/`, starts: i === 0 }));

const ORDER: Record<PageItem['kind'], number> = { llibre: 0, regió: 1, secció: 2, mapa: 3, panoràmica: 4, dibuix: 5, agulla: 6, escalador: 7 };
/** Items of a page: what starts there first (in book order), then what only continues there. */
export function pageItems(p: number): PageItem[] {
	return [...(byPage.get(p) ?? [])].sort((a, b) => Number(b.starts) - Number(a.starts) || ORDER[a.kind] - ORDER[b.kind]);
}
/** The section a page belongs to (the last section starting on or before it), for orientation. */
export function sectionAt(p: number) {
	let best: (typeof dataset.sections)[number] | undefined;
	for (const s of dataset.sections) if ((s.bookReference?.pageStart ?? Infinity) <= p && (!best || s.bookReference!.pageStart! > best.bookReference!.pageStart!)) best = s;
	return best && (best.bookReference?.pageEnd ?? Infinity) >= p - 1 ? best : undefined;
}
