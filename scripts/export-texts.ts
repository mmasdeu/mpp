/**
 * data/textos.json: all the book text shown on the web, in one file that can be searched and edited by hand (see src/lib/data/texts.ts).
 * First imports hand edits made since it was last written, then rewrites it. Usage: npm run textos
 */
import { fileURLToPath } from 'node:url';
import { syncTexts } from '../src/lib/data/texts';
const root = fileURLToPath(new URL('..', import.meta.url));
try {
	const r = syncTexts(root);
	if (r.imported.length) console.log(`Importades ${r.imported.length} correccions fetes a mà: ${r.imported.join(', ')}`);
	for (const w of r.warnings) console.warn('Avís:', w);
	console.log(`data/textos.json: ${r.total} textos`);
} catch (e) {
	console.error((e as Error).message);
	process.exit(1);
}
