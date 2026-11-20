/**
 * Editor back end (Node only; used by the Vite dev server when started with `npm run edit`, never part of the static build).
 * Every edit is written straight into the project's data files, in the overlay layers described in docs/architecture.md, so the raw
 * extraction is never touched and every change is visible in git:
 *   decisions  -> data/review/decisions.json   (accept / verify / correct / reject / merge, with reviewer and date)
 *   location   -> data/locations.json
 *   drawing    -> data/drawings.json (+ data/source/drawings-manual.csv, so re-running match-drawings keeps it)
 *   map        -> data/maps.json (+ data/source/maps-manual.csv)
 *   intro      -> data/review/intros.json
 *   structure  -> data/review/structure.json
 */
import { existsSync, readFileSync, renameSync, watch, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateDecisions, type Decision } from '../data/review';
import { exportTexts, importTexts, syncTexts } from '../data/texts';

export interface Result { status: number; json: unknown }
const ok = (json: unknown = { ok: true }): Result => ({ status: 200, json });
const bad = (message: string, status = 400): Result => ({ status, json: { error: message } });

export function handleEdit(root: string, method: string, path: string, query: URLSearchParams, body: any): Result {
	const file = (f: string) => join(root, 'data', f);
	const read = <T>(f: string, fallback: T): T => (existsSync(file(f)) ? JSON.parse(readFileSync(file(f), 'utf8')) : fallback);
	const write = (f: string, v: unknown) => { const tmp = file(f) + '.tmp'; writeFileSync(tmp, JSON.stringify(v, null, f.startsWith('locations') || f.startsWith('maps') || f.startsWith('drawings') ? 1 : 1) + '\n'); renameSync(tmp, file(f)); };
	const needleIds = new Set<string>([...read<any[]>('needles.json', []), ...read<any[]>('review/additions.json', [])].map((n) => n.id));
	const sectionIds = new Set<string>((read<any[]>('sections.json', [])).map((s) => s.id));
	const regionIds = new Set<string>((read<any[]>('regions.json', [])).map((r) => r.id));
	const today = () => new Date().toISOString().slice(0, 10);
	const reviewer = (): string | null => (typeof body?.reviewer === 'string' && body.reviewer.trim() ? body.reviewer.trim() : null);
	const page = (p: unknown): number | null => (Number.isInteger(p) && (p as number) >= 1 && (p as number) <= 409 ? (p as number) : null);

	if (path === '/ping') return ok({ ok: true, editor: true });

	if (path === '/decision') {
		const decisions = read<Decision[]>('review/decisions.json', []);
		if (method === 'DELETE') {
			const id = query.get('needleId'); const i = decisions.findIndex((d) => d.needleId === id);
			if (i < 0) return bad('no decision for that needle', 404);
			decisions.splice(i, 1); write('review/decisions.json', decisions); return ok();
		}
		if (method !== 'POST') return bad('method', 405);
		const rev = reviewer(); if (!rev) return bad('reviewer name required');
		const d: Decision = { ...body, reviewer: rev, date: today() };
		const i = decisions.findIndex((x) => x.needleId === d.needleId);
		const next = i >= 0 ? decisions.map((x, j) => (j === i ? d : x)) : [...decisions, d];
		const errs = validateDecisions(next, needleIds);
		if (errs.length) return bad(errs.map((e) => e.message).join('; '));
		next.sort((a, b) => a.needleId.localeCompare(b.needleId)); write('review/decisions.json', next); return ok();
	}

	if (path === '/location') {
		const locs = read<any[]>('locations.json', []);
		if (method === 'DELETE') { const id = query.get('needleId'); write('locations.json', locs.filter((l) => l.needleId !== id)); return ok(); }
		const { needleId, latitude, longitude, elevation, accuracy } = body ?? {};
		const rev = reviewer(); if (!rev) return bad('reviewer name required');
		if (!needleIds.has(needleId)) return bad('unknown needle');
		if (typeof latitude !== 'number' || typeof longitude !== 'number' || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return bad('invalid coordinates');
		if (!['verified', 'approximate', 'unknown'].includes(accuracy)) return bad('accuracy required');
		const rec: any = { needleId, latitude, longitude, ...(typeof elevation === 'number' ? { elevation } : {}), accuracy,
			source: `Editor: ${rev}, ${today()}`, matchedBy: 'id', note: body.note || undefined };
		const next = [...locs.filter((l) => l.needleId !== needleId), rec].sort((a, b) => a.needleId.localeCompare(b.needleId));
		write('locations.json', next); return ok();
	}

	if (path === '/drawing' || path === '/map') {
		// body: { page, from?: id, to?: id } -> removes the image from `from` and/or adds it to `to`
		const isMap = path === '/map'; const p = page(body?.page); if (!p) return bad('invalid page');
		const from: string | undefined = body.from || undefined, to: string | undefined = body.to || undefined;
		if (!from && !to) return bad('from or to required');
		const valid = (id: string) => (isMap ? sectionIds.has(id) || regionIds.has(id) : needleIds.has(id));
		if ((from && !valid(from)) || (to && !valid(to))) return bad('unknown target');
		const jsonFile = isMap ? 'maps.json' : 'drawings.json', csvFile = isMap ? 'source/maps-manual.csv' : 'source/drawings-manual.csv';
		const data: any = read<any>(jsonFile, isMap ? { sections: {}, regions: {} } : {});
		const bucket = (id: string): Record<string, number[]> => (isMap ? data[id.startsWith('s') ? 'sections' : 'regions'] : data);
		const rows = existsSync(file(csvFile)) ? parseCsv(readFileSync(file(csvFile), 'utf8')) : [];
		const note = (id: string, action: 'add' | 'remove', reason: string) => {
			for (let i = rows.length - 1; i >= 0; i--) if (+rows[i][0] === p && rows[i][1] === id) rows.splice(i, 1);
			if (action === 'remove') rows.push([String(p), id, 'remove', reason]); else rows.push([String(p), id, 'add', reason]);
		};
		if (from) { const b = bucket(from); b[from] = (b[from] ?? []).filter((x) => x !== p); if (!b[from].length) delete b[from]; note(from, 'remove', `Editor: ${reviewer() ?? '?'}, ${today()}`); }
		if (to) { const b = bucket(to); b[to] = [...new Set([...(b[to] ?? []), p])].sort((a, c) => a - c); note(to, 'add', `Editor: ${reviewer() ?? '?'}, ${today()}`); }
		const sorted = isMap ? { sections: sortKeys(data.sections), regions: sortKeys(data.regions) } : sortKeys(data);
		write(jsonFile, sorted);
		const header = ['page', isMap ? 'target' : 'needle_id', 'action', 'reason'];
		writeFileSync(file(csvFile), [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n');
		return ok();
	}

	if (path === '/intro') {
		const { kind, id, text } = body ?? {}; const rev = reviewer(); if (!rev) return bad('reviewer name required');
		if (!(kind === 'section' ? sectionIds.has(id) : kind === 'region' ? regionIds.has(id) : false)) return bad('unknown section/region');
		const data = read<any>('review/intros.json', { sections: {}, regions: {} }); const bucket = data[kind === 'section' ? 'sections' : 'regions'];
		if (typeof text !== 'string' || !text.trim()) delete bucket[id];
		else bucket[id] = { text: text.trim(), pages: Array.isArray(body.pages) ? body.pages : [], meanConf: 100, status: 'reviewed', reviewer: rev, date: today() };
		write('review/intros.json', data); return ok();
	}

	if (path === '/structure') {
		const { sectionId, regionId } = body ?? {};
		if (!sectionIds.has(sectionId) || !regionIds.has(regionId)) return bad('unknown section/region');
		const st = read<any>('review/structure.json', { sectionRegion: {} });
		const original = read<any[]>('sections.json', []).find((s) => s.id === sectionId)?.regionId;
		if (regionId === original) delete st.sectionRegion[sectionId]; else st.sectionRegion[sectionId] = regionId;
		write('review/structure.json', st); return ok();
	}
	return bad('not found', 404);
}

const sortKeys = (o: Record<string, number[]>) => Object.fromEntries(Object.entries(o ?? {}).sort(([a], [b]) => a.localeCompare(b)));
const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
function parseCsv(text: string): string[][] {
	const rows: string[][] = []; let row: string[] = [], cell = '', q = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
		else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; }
		else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
	}
	if (cell || row.length) { row.push(cell); rows.push(row); }
	return rows.slice(1).filter((r) => r.some((x) => x.trim()));          // drop header
}

/** Vite/Connect middleware: only mounted by `npm run edit`; refuses anything that is not a same-origin request from the page. */
export function editMiddleware(root: string) {
	// data/textos.json (all the text, editable by hand): hand edits are imported when the editor starts, whenever the file changes on
	// disk and before every saved change; the file is rewritten afterwards. If it is not valid JSON nothing is imported or overwritten.
	const log = (r: { imported: string[]; warnings: string[] }) => {
		if (r.imported.length) console.log(`[textos.json] importades ${r.imported.length} correccions: ${r.imported.join(', ')}`);
		for (const w of r.warnings) console.warn(`[textos.json] ${w}`);
	};
	let textsOk = true;
	const sync = () => { try { log(syncTexts(root)); textsOk = true; } catch (e) { textsOk = false; console.warn(`[textos.json] ${(e as Error).message}`); } };
	sync();
	const textsFile = join(root, 'data', 'textos.json'), baseFile = join(root, 'data', 'ocr', 'textos-base.json');
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		watch(join(root, 'data'), (_ev, name) => {
			if (name !== 'textos.json') return;
			clearTimeout(timer);
			timer = setTimeout(() => {
				try { if (existsSync(baseFile) && readFileSync(textsFile, 'utf8') === readFileSync(baseFile, 'utf8')) return; } catch { return; }   // our own write
				sync();
			}, 400);
		});
	} catch { /* no file watching: edits are imported on the next save or restart */ }
	return (req: any, res: any, next: () => void) => {
		if (!req.url?.startsWith('/__edit/')) return next();
		const send = (r: Result) => { res.statusCode = r.status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(r.json)); };
		const host = req.headers.host ?? '', origin = req.headers.origin;
		if (req.headers['x-editor'] !== '1' || (origin && new URL(origin).host !== host)) return send(bad('forbidden', 403));
		const url = new URL(req.url, 'http://x'); const path = url.pathname.slice('/__edit'.length);
		let raw = '';
		req.on('data', (c: Buffer) => { raw += c; if (raw.length > 5_000_000) req.destroy(); });
		req.on('end', () => {
			try {
				const mutating = req.method !== 'GET';
				if (mutating) { try { log(importTexts(root)); textsOk = true; } catch (e) { textsOk = false; console.warn(`[textos.json] ${(e as Error).message}`); } }
				const r = handleEdit(root, req.method, path, url.searchParams, raw ? JSON.parse(raw) : {});
				if (mutating && r.status === 200 && textsOk) { try { exportTexts(root); } catch { /* ignore */ } }
				send(r);
			}
			catch (e) { send(bad(String((e as Error).message), 500)); }
		});
	};
}
