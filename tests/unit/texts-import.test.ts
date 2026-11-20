import { describe, it, expect, beforeEach } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportTexts, importTexts, syncTexts, type TextEntry } from '../../src/lib/data/texts';

const repo = fileURLToPath(new URL('../..', import.meta.url));
let root = '';
const rd = (f: string) => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
const edit = (fn: (t: TextEntry[]) => void) => { const t = rd('textos.json') as TextEntry[]; fn(t); writeFileSync(join(root, 'data/textos.json'), JSON.stringify(t, null, 1)); };
const entry = (t: TextEntry[], id: string) => t.find((e) => e.id === id)!;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'textos-'));
	cpSync(join(repo, 'data'), join(root, 'data'), { recursive: true, filter: (s) => !s.includes(join('ocr', 'pages')) });
	process.env.MPP_REVIEWER = 'Prova';
	exportTexts(root);
});

describe('hand edits of data/textos.json', () => {
	it('a changed needle text becomes a reviewed transcription; the file then says «revisat»', () => {
		edit((t) => { entry(t, 'n0001').text = 'Text corregit a mà.'; });
		expect(syncTexts(root).imported).toEqual(['n0001']);
		expect(rd('review/decisions.json').find((d: any) => d.needleId === 'n0001')).toMatchObject({ action: 'correct', description: 'Text corregit a mà.', reviewer: 'Prova' });
		expect(entry(rd('textos.json'), 'n0001')).toMatchObject({ estat: 'revisat', text: 'Text corregit a mà.' });
	});
	it('setting «estat» to "revisat" marks the text as reviewed as it is', () => {
		const before = entry(rd('textos.json'), 'n0002');
		edit((t) => { entry(t, 'n0002').estat = 'revisat'; });
		syncTexts(root);
		expect(rd('review/decisions.json').find((d: any) => d.needleId === 'n0002').description).toBe(before.text);
	});
	it('changes made meanwhile in the web editor are not undone by a stale file', () => {
		const dec = rd('review/decisions.json');
		writeFileSync(join(root, 'data/review/decisions.json'), JSON.stringify([...dec.filter((d: any) => d.needleId !== 'n0003'), { needleId: 'n0003', action: 'correct', description: 'Des de l\'editor web', reviewer: 'W', date: '2026-01-01' }]));
		expect(importTexts(root).imported).toEqual([]);
		expect(rd('review/decisions.json').find((d: any) => d.needleId === 'n0003').description).toBe('Des de l\'editor web');
	});
	it('section introductions and biographies go to their own review files', () => {
		edit((t) => { entry(t, 's01').text = 'Introducció revisada.'; entry(t, 'anglada-josep-manuel').text = 'Biografia revisada.'; });
		syncTexts(root);
		expect(rd('review/intros.json').sections.s01).toMatchObject({ text: 'Introducció revisada.', status: 'reviewed' });
		expect(rd('review/biographies.json').find((b: any) => b.id === 'anglada-josep-manuel').text).toBe('Biografia revisada.');
	});
	it('invalid JSON: an error, and nothing is touched', () => {
		const dec = readFileSync(join(root, 'data/review/decisions.json'), 'utf8');
		writeFileSync(join(root, 'data/textos.json'), '[ { "id": "n0001", ');
		expect(() => syncTexts(root)).toThrow(/JSON/);
		expect(readFileSync(join(root, 'data/textos.json'), 'utf8')).toBe('[ { "id": "n0001", ');
		expect(readFileSync(join(root, 'data/review/decisions.json'), 'utf8')).toBe(dec);
	});
});
describe('front matter', () => {
	it('the Advertiment comes first and its corrections go to review/front.json', () => {
		const t = rd('textos.json') as TextEntry[];
		expect(t[0]).toMatchObject({ id: 'advertiment', tipus: 'llibre', web: '/' });
		edit((x) => { entry(x, 'advertiment').text = 'Advertiment revisat.'; });
		syncTexts(root);
		expect(rd('review/front.json').advertiment.text).toBe('Advertiment revisat.');
		expect(entry(rd('textos.json'), 'advertiment').estat).toBe('revisat');
	});
});
