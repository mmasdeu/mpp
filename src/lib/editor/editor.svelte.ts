/** Editor mode state (only meaningful when started with `npm run edit`, i.e. __EDITOR__ is true). */
export const editor = $state({ on: false, reviewer: '', busy: false, error: '' });
const KEY = 'pam-editor-v1';
export function loadEditor() {
	try { const s = JSON.parse(localStorage.getItem(KEY) ?? '{}'); editor.on = !!s.on; editor.reviewer = s.reviewer ?? ''; } catch { /* ignore */ }
}
export function saveEditor() { try { localStorage.setItem(KEY, JSON.stringify({ on: editor.on, reviewer: editor.reviewer })); } catch { /* private mode */ } }

/** POST/DELETE to the local write-back API, then reload so every page shows the files as they now are. */
export async function act(path: string, body: Record<string, unknown> = {}, method: 'POST' | 'DELETE' = 'POST', query = ''): Promise<boolean> {
	editor.busy = true; editor.error = '';
	try {
		const r = await fetch(`/__edit${path}${query}`, { method, headers: { 'content-type': 'application/json', 'x-editor': '1' }, body: method === 'POST' ? JSON.stringify({ ...body, reviewer: editor.reviewer }) : undefined });
		const j = await r.json().catch(() => ({}));
		if (!r.ok) { editor.error = j.error ?? `Error ${r.status}`; return false; }
		location.reload(); return true;
	} catch (e) { editor.error = String((e as Error).message); return false; }
	finally { editor.busy = false; }
}
export const needReviewer = (): boolean => { if (editor.reviewer.trim()) return true; editor.error = 'Indiqueu el vostre nom (revisor/a) a la barra de l\'editor.'; return false; };
