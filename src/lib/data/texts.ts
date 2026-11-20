/**
 * All the book text the web shows, in one searchable file: data/textos.json (Node only; git-ignored, it holds the book's text).
 * One entry per text, in book order: region and section introductions, needles (with the entries merged into them), climbers'
 * biographies. Each entry says whether the text is a reviewed transcription or the raw OCR, where it is in the book and where to correct
 * it on the web.
 *
 * The file can also be edited by hand (any tool): `syncTexts` first imports what changed since it was last written — compared with a
 * snapshot of that version (data/ocr/textos-base.json), so changes made meanwhile in the web editor are never undone — into the same
 * review layers the web editor writes (decisions, review/intros.json, review/biographies.json), and then writes the file again.
 * Run by the editor (on start, when the file changes on disk, and around every saved change), by `npm run textos` and by the build.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { applyAdditions } from './additions';
import { applyReview, validateDecisions, type Decision } from './review';
import { applyStructure } from './structure';
import { applyFixes } from './fixes';
import type { Dataset, Needle } from './types';

export interface TextEntry {
	id: string;
	tipus: 'llibre' | 'regió' | 'secció' | 'agulla' | 'escalador';
	nom: string;
	/** where it belongs: «Regió › Secció» */
	lloc?: string;
	pagines: number[];
	/** revisat: reviewed transcription; ocr: unreviewed OCR; sense text: nothing transcribed yet */
	estat: 'revisat' | 'ocr' | 'sense text';
	/** page on the web (relative to the site root) */
	web: string;
	text: string;
	/** entries merged into this needle, when their text is shown here too */
	fusionades?: string[];
}

export function buildTexts(root: string): TextEntry[] {
	const rd = <T>(f: string, fallback: T): T => { const p = join(root, 'data', f); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback; };
	const raw: Dataset = applyFixes(applyAdditions({ regions: rd('regions.json', []), sections: rd('sections.json', []), needles: rd('needles.json', []) }, rd('review/additions.json', [])), rd('review/fixes.json', {}));
	const d = applyReview(applyStructure(raw, rd('review/structure.json', undefined)), rd<Decision[]>('review/decisions.json', []));
	const ocr = rd<Record<string, { text: string; pages: number[] }>>('ocr/descriptions.json', {});
	const ocrIntros = rd<Record<string, Record<string, { text: string; pages: number[] }>>>('ocr/intros.json', { sections: {}, regions: {} });
	const revIntros = rd<Record<string, Record<string, { text: string; pages?: number[] }>>>('review/intros.json', { sections: {}, regions: {} });
	const bios = rd<{ id: string; name: string; pages: number[]; text?: string }[]>('review/biographies.json', []);
	const ocrBios = rd<{ id: string; text: string }[]>('ocr/biographies.json', []);
	const out: TextEntry[] = [];
	// front matter shown on the home page (Advertiment…)
	const frontOcr = rd<Record<string, { text: string }>>('ocr/front.json', {}), frontRev = rd<Record<string, { text: string }>>('review/front.json', {});
	for (const f of rd<{ id: string; title: string; pages: number[]; kind?: string }[]>('front.json', [])) {
		if (f.kind) continue;   // maps and the index have no text of their own
		const t = frontRev[f.id]?.text ?? frontOcr[f.id]?.text;
		out.push({ id: f.id, tipus: 'llibre', nom: f.title, pagines: f.pages, estat: frontRev[f.id] ? 'revisat' : t ? 'ocr' : 'sense text', web: '/', text: t ?? '' });
	}

	const intro = (kind: 'regions' | 'sections', id: string, tipus: 'regió' | 'secció', nom: string, lloc: string | undefined, web: string) => {
		const r = revIntros[kind]?.[id], o = ocrIntros[kind]?.[id];
		if (!r && !o) return;
		out.push({ id, tipus, nom, ...(lloc ? { lloc } : {}), pagines: r?.pages ?? o?.pages ?? [], estat: r ? 'revisat' : 'ocr', web, text: (r ?? o)!.text });
	};
	const needleText = (n: Needle, lloc: string): TextEntry => {
		const pagines = [...new Set(n.bookReferences.map((b) => b.page))].sort((a, b) => a - b);
		const base = { id: n.id, tipus: 'agulla' as const, nom: n.name, lloc, pagines };
		const web = `/needles/${n.id}/`;
		const own = { page: ocr[n.id]?.pages[0] ?? n.bookReferences[0]?.page ?? 0, text: n.description ?? ocr[n.id]?.text, reviewed: !!n.description };
		const merged = n.descriptionIncludesMerged ? [] : (n.mergedParts ?? []).map((p) => ({ page: ocr[p.id]?.pages[0] ?? p.page, text: p.description ?? ocr[p.id]?.text, reviewed: !!p.description, name: p.name }));
		if (!merged.length) return { ...base, estat: own.text ? (own.reviewed ? 'revisat' : 'ocr') : 'sense text', web, text: own.text ?? '' };
		// a merged needle: its own text and the merged entries' texts in book order, each merged one headed by its name
		const parts = [{ ...own, name: '' }, ...merged].sort((a, b) => a.page - b.page);
		const text = parts.filter((p) => p.text).map((p) => (p.name ? `[${p.name}]\n${p.text}` : p.text)).join('\n\n');
		return { ...base, estat: parts.every((p) => p.reviewed) ? 'revisat' : text ? 'ocr' : 'sense text', web, text, fusionades: n.mergedParts!.map((p) => p.id) };
	};

	for (const r of d.regions) {
		intro('regions', r.id, 'regió', r.name, undefined, `/regions/${r.slug}/`);
		for (const sid of r.sectionIds) {
			const s = d.sections.find((x) => x.id === sid);
			if (!s) continue;
			const lloc = `${r.name} › Secció ${s.order}: ${s.name}`;
			intro('sections', s.id, 'secció', s.name, r.name, `/sections/${s.id}/`);
			for (const nid of s.needleIds) { const n = d.needles.find((x) => x.id === nid); if (n) out.push(needleText(n, lloc)); }
		}
	}
	for (const b of bios) {
		const t = b.text ?? ocrBios.find((o) => o.id === b.id)?.text;
		out.push({ id: b.id, tipus: 'escalador', nom: b.name, pagines: b.pages, estat: b.text ? 'revisat' : t ? 'ocr' : 'sense text', web: `/escaladors/${b.id}/`, text: t ?? '' });
	}
	return out;
}

const TEXTS = 'data/textos.json', BASE = 'data/ocr/textos-base.json';
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Who signs imported edits: $MPP_REVIEWER, else git's user.name, else «edició manual». */
function whoEdits(root: string): string {
	if (process.env.MPP_REVIEWER?.trim()) return process.env.MPP_REVIEWER.trim();
	try { const n = execFileSync('git', ['config', 'user.name'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); if (n) return n; } catch { /* no git */ }
	return 'edició manual';
}

export interface ImportResult { imported: string[]; warnings: string[] }

/**
 * Imports hand edits of data/textos.json: entries whose text, state («estat»: set it to "revisat" to mark the text as reviewed), name or
 * pages differ from the last written version. Other fields are ignored. Throws on invalid JSON (nothing is touched then).
 */
export function importTexts(root: string): ImportResult {
	const res: ImportResult = { imported: [], warnings: [] };
	const f = join(root, TEXTS), b = join(root, BASE);
	if (!existsSync(f) || !existsSync(b)) return res;
	let edited: TextEntry[];
	try { edited = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { throw new Error(`data/textos.json no és JSON vàlid (${(e as Error).message}); no s'ha importat ni regenerat res`); }
	if (!Array.isArray(edited)) throw new Error('data/textos.json ha de ser una llista d\'entrades');
	const base = new Map((JSON.parse(readFileSync(b, 'utf8')) as TextEntry[]).map((e) => [`${e.tipus}:${e.id}`, e]));
	const changes = edited.filter((e) => e && typeof e === 'object' && base.has(`${e.tipus}:${e.id}`)).map((e) => ({ e, was: base.get(`${e.tipus}:${e.id}`)! }))
		.filter(({ e, was }) => !same([e.text, e.estat, e.nom, e.pagines], [was.text, was.estat, was.nom, was.pagines]));
	if (!changes.length) return res;

	const file = (x: string) => join(root, 'data', x);
	const rd = <T>(x: string, fallback: T): T => (existsSync(file(x)) ? JSON.parse(readFileSync(file(x), 'utf8')) : fallback);
	const wr = (x: string, v: unknown) => { const t = file(x) + '.tmp'; writeFileSync(t, JSON.stringify(v, null, 1) + '\n'); renameSync(t, file(x)); };
	const reviewer = whoEdits(root), date = new Date().toISOString().slice(0, 10);
	let decisions = rd<Decision[]>('review/decisions.json', []);
	const intros = rd<Record<string, Record<string, unknown>>>('review/intros.json', { sections: {}, regions: {} });
	const bios = rd<{ id: string; name: string; pages: number[]; text?: string; reviewer?: string; date?: string }[]>('review/biographies.json', []);
	const front = rd<Record<string, unknown>>('review/front.json', {});
	let dDirty = false, iDirty = false, bDirty = false, fDirty = false;
	const text = (e: TextEntry) => (typeof e.text === 'string' ? e.text.replace(/\r\n/g, '\n').trim() : '');

	for (const { e, was } of changes) {
		const t = text(e);
		if (e.tipus === 'agulla') {
			const old = decisions.find((x) => x.needleId === e.id);
			if (old && (old.action === 'reject' || old.action === 'merge')) { res.warnings.push(`${e.id}: l'agulla està ${old.action === 'reject' ? 'rebutjada' : 'fusionada'}; no s'ha importat`); continue; }
			const d: Decision = { ...(old?.action === 'correct' ? old : {}), needleId: e.id, action: 'correct', reviewer, date };
			if (t !== text(was) || (e.estat === 'revisat' && was.estat !== 'revisat')) {
				if (t) { d.description = t; if (e.fusionades?.length) d.mergedText = true; } else { delete d.description; delete d.mergedText; }
			}
			if (typeof e.nom === 'string' && e.nom.trim() && e.nom !== was.nom) d.name = e.nom.trim();
			if (Array.isArray(e.pagines) && !same(e.pagines, was.pagines)) d.pages = e.pagines.map(Number);
			const changed = d.description !== undefined || d.name !== undefined || d.semirRef !== undefined || d.alternativeNames !== undefined || d.pages !== undefined;
			decisions = [...decisions.filter((x) => x.needleId !== e.id), ...(changed ? [d] : old && old.action !== 'correct' ? [old] : [])];
			dDirty = true;
		} else if (e.tipus === 'regió' || e.tipus === 'secció') {
			const bucket = intros[e.tipus === 'regió' ? 'regions' : 'sections'] ??= {};
			if (t) bucket[e.id] = { text: t, pages: Array.isArray(e.pagines) ? e.pagines : was.pagines, meanConf: 100, status: 'reviewed', reviewer, date };
			else delete bucket[e.id];
			iDirty = true;
		} else if (e.tipus === 'llibre') {
			if (t) front[e.id] = { text: t, reviewer, date }; else delete front[e.id];
			fDirty = true;
		} else if (e.tipus === 'escalador') {
			const bio = bios.find((x) => x.id === e.id);
			if (!bio) { res.warnings.push(`${e.id}: escalador desconegut`); continue; }
			if (t !== text(was) || (e.estat === 'revisat' && was.estat !== 'revisat')) { if (t) Object.assign(bio, { text: t, reviewer, date }); else { delete bio.text; delete bio.reviewer; delete bio.date; } }
			if (typeof e.nom === 'string' && e.nom.trim() && e.nom !== was.nom) bio.name = e.nom.trim();
			if (Array.isArray(e.pagines) && !same(e.pagines, was.pagines)) bio.pages = e.pagines.map(Number);
			bDirty = true;
		} else { res.warnings.push(`${e.id}: tipus desconegut «${e.tipus}»`); continue; }
		res.imported.push(e.id);
	}
	if (dDirty) {
		const ids = new Set([...rd<{ id: string }[]>('needles.json', []), ...rd<{ id: string }[]>('review/additions.json', [])].map((n) => n.id));
		const errs = validateDecisions(decisions, ids);
		if (errs.length) throw new Error(`data/textos.json: ${errs.map((x) => x.message).join('; ')}; no s'ha importat res`);
		decisions.sort((a, b) => a.needleId.localeCompare(b.needleId));
	}
	if (dDirty) wr('review/decisions.json', decisions);
	if (iDirty) wr('review/intros.json', intros);
	if (bDirty) wr('review/biographies.json', bios);
	if (fDirty) wr('review/front.json', front);
	return res;
}

/** Writes data/textos.json (and the snapshot used to spot hand edits); returns the number of entries. */
export function exportTexts(root: string): number {
	const entries = buildTexts(root);
	const json = JSON.stringify(entries, null, 1) + '\n';
	for (const x of [TEXTS, BASE]) { const f = join(root, x), tmp = f + '.tmp'; mkdirSync(dirname(f), { recursive: true }); writeFileSync(tmp, json); renameSync(tmp, f); }
	return entries.length;
}

/** Import hand edits, then rewrite the file. Throws (without touching anything) when the file is not valid JSON. */
export function syncTexts(root: string): ImportResult & { total: number } {
	const r = importTexts(root);
	return { ...r, total: exportTexts(root) };
}
