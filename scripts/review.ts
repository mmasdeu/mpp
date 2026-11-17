/**
 * Review workflow for extracted needles. Decisions go to data/review/decisions.json; raw extraction is never edited.
 *
 *   tsx scripts/review.ts progress
 *   tsx scripts/review.ts list [--section s05] [--status unreviewed|reviewed] [--limit 30]
 *   tsx scripts/review.ts show n0042
 *   tsx scripts/review.ts accept n0042 n0043 ... --reviewer "Name"
 *   tsx scripts/review.ts correct n0042 [--name "..."] [--alt "a;b"] [--semir 12] --reviewer "Name"
 *   tsx scripts/review.ts reject n0042 --reason "map label" --reviewer "Name"
 *   tsx scripts/review.ts merge n0042 --into n0010 --reason "same rock" --reviewer "Name"
 *   tsx scripts/review.ts undo n0042
 *   tsx scripts/review.ts export out.csv [--section s05]    (unreviewed rows, for offline review)
 *   tsx scripts/review.ts import in.csv --reviewer "Name"   (rows with a filled "action" column)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { Decision } from '../src/lib/data/review';
import { validateDecisions } from '../src/lib/data/review';
import { dataUrl, loadDataset, rawDataset, rd } from './_load';

const argv = process.argv.slice(2);
const cmd = argv[0];
const pos = argv.slice(1).filter((a, i, all) => !a.startsWith('--') && !(i > 0 && all[i - 1].startsWith('--')));
const opt = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const raw = rawDataset();
const ids = new Set(raw.needles.map((n) => n.id));
const decisions: Decision[] = rd('review/decisions.json');
const today = new Date().toISOString().slice(0, 10);
const save = () => {
	const errs = validateDecisions(decisions, ids);
	if (errs.length) { errs.forEach((e) => console.error('ERROR', e.message)); process.exit(1); }
	decisions.sort((a, b) => a.needleId.localeCompare(b.needleId));
	writeFileSync(dataUrl('review/decisions.json'), JSON.stringify(decisions, null, 1) + '\n');
};
const reviewer = () => { const r = opt('--reviewer') ?? process.env.REVIEWER; if (!r) { console.error('--reviewer (or REVIEWER env) required'); process.exit(2); } return r; };
const put = (x: Decision) => { const i = decisions.findIndex((d) => d.needleId === x.needleId); if (i >= 0) decisions[i] = x; else decisions.push(x); };
const need = (id: string) => { if (!ids.has(id)) { console.error(`unknown needle ${id}`); process.exit(2); } };

const csvCell = (s: unknown) => { const t = String(s ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
function csvRows(text: string): string[][] {
	const rows: string[][] = []; let row: string[] = [], cell = '', q = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
		else if (c === '"') q = true;
		else if (c === ',') { row.push(cell); cell = ''; }
		else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
		else cell += c;
	}
	if (cell || row.length) { row.push(cell); rows.push(row); }
	return rows.filter((r) => r.some((x) => x.trim()));
}

const statusOf = (id: string) => {
	const x = decisions.find((d) => d.needleId === id);
	return x ? (x.action === 'reject' ? 'rejected' : x.action === 'merge' ? 'merged' : 'reviewed') : 'unreviewed';
};

switch (cmd) {
	case 'progress': {
		const t = { unreviewed: 0, reviewed: 0, rejected: 0, merged: 0 };
		console.log('section  name                     unrev  rev  rej  merged');
		for (const s of raw.sections) {
			const c = { unreviewed: 0, reviewed: 0, rejected: 0, merged: 0 } as Record<string, number>;
			for (const id of s.needleIds) c[statusOf(id)]++;
			for (const k of Object.keys(t)) (t as any)[k] += c[k];
			console.log(`${s.id}      ${s.name.padEnd(24)} ${String(c.unreviewed).padStart(5)} ${String(c.reviewed).padStart(4)} ${String(c.rejected).padStart(4)} ${String(c.merged).padStart(6)}`);
		}
		const total = raw.needles.length;
		console.log(`\nTOTAL ${total}: ${t.reviewed} reviewed, ${t.rejected} rejected, ${t.merged} merged, ${t.unreviewed} unreviewed (${Math.round((100 * (total - t.unreviewed)) / total)}% done)`);
		break;
	}
	case 'list': {
		const sec = opt('--section'), st = opt('--status') ?? 'unreviewed', lim = +(opt('--limit') ?? 30);
		const rows = raw.needles.filter((n) => (!sec || n.sectionId === sec) && statusOf(n.id) === st);
		rows.slice(0, lim).forEach((n) => console.log(`${n.id}  ${n.sectionId}  p.${n.bookReferences[0]?.page}  ${n.semirRef ? `(${n.semirRef}) ` : ''}${n.name}`));
		if (rows.length > lim) console.log(`... ${rows.length - lim} more`);
		break;
	}
	case 'show': {
		const id = pos[0]; need(id);
		const n = raw.needles.find((x) => x.id === id)!;
		const cand = rd('source/original-extraction/all-candidates.json').candidates.find((c: any) => c.rawHeading && n.bookReferences[0].page === c.pdfPage && c.semirRef === (n.semirRef ?? null) && c.name.toLowerCase().replace(/\W/g, '') === n.name.toLowerCase().replace(/\W/g, '').replace(/^$/, ''));
		console.log(JSON.stringify({ ...n, rawHeading: cand?.rawHeading, status: statusOf(id), decision: decisions.find((d) => d.needleId === id) }, null, 1));
		console.log(`Check against the book: pdftotext -layout -f ${n.bookReferences[0].page} -l ${n.bookReferences[0].page} "Montserrat Pam a Pam.pdf" -`);
		break;
	}
	case 'accept': pos.forEach(need); pos.forEach((id) => put({ needleId: id, action: 'accept', reviewer: reviewer(), date: today })); save(); console.log(`accepted ${pos.length}`); break;
	case 'correct': {
		const id = pos[0]; need(id);
		put({ needleId: id, action: 'correct', name: opt('--name'), alternativeNames: opt('--alt')?.split(';').map((s) => s.trim()).filter(Boolean), semirRef: opt('--semir'), reviewer: reviewer(), date: today });
		save(); console.log(`corrected ${id}`); break;
	}
	case 'reject': { const id = pos[0]; need(id); put({ needleId: id, action: 'reject', reason: opt('--reason'), reviewer: reviewer(), date: today }); save(); console.log(`rejected ${id}`); break; }
	case 'merge': { const id = pos[0]; need(id); put({ needleId: id, action: 'merge', mergeInto: opt('--into'), reason: opt('--reason'), reviewer: reviewer(), date: today }); save(); console.log(`merged ${id}`); break; }
	case 'undo': { const i = decisions.findIndex((d) => d.needleId === pos[0]); if (i < 0) { console.error('no decision'); process.exit(2); } decisions.splice(i, 1); save(); console.log('removed decision'); break; }
	case 'export': {
		const sec = opt('--section'), out = pos[0];
		const head = ['needle_id', 'section', 'page', 'name', 'semir_ref', 'action', 'corrected_name', 'alternative_names', 'merge_into', 'reason'];
		const rows = raw.needles.filter((n) => (!sec || n.sectionId === sec) && statusOf(n.id) === 'unreviewed')
			.map((n) => [n.id, n.sectionId, n.bookReferences[0]?.page, n.name, n.semirRef ?? '', '', '', '', '', '']);
		writeFileSync(out, [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n');
		console.log(`exported ${rows.length} rows to ${out}. Fill "action" with accept|correct|reject|merge.`); break;
	}
	case 'import': {
		const [h, ...rows] = csvRows(readFileSync(pos[0], 'utf8')); const col = (r: string[], k: string) => r[h.indexOf(k)]?.trim() ?? '';
		const rev = reviewer(); let n = 0;
		for (const r of rows) {
			const action = col(r, 'action'); if (!action) continue;
			if (!['accept', 'correct', 'reject', 'merge'].includes(action)) { console.error(`bad action "${action}" for ${col(r, 'needle_id')}`); process.exit(2); }
			need(col(r, 'needle_id'));
			put({ needleId: col(r, 'needle_id'), action: action as Decision['action'], name: col(r, 'corrected_name') || undefined,
				alternativeNames: col(r, 'alternative_names') ? col(r, 'alternative_names').split(';').map((s) => s.trim()) : undefined,
				mergeInto: col(r, 'merge_into') || undefined, reason: col(r, 'reason') || undefined, reviewer: rev, date: today });
			n++;
		}
		save(); console.log(`imported ${n} decisions`); break;
	}
	default: console.error(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]); process.exit(2);
}
void loadDataset;
