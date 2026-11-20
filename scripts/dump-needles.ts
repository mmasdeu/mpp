/** Prints the needles as the web shows them (raw extraction + review layers) as JSON, for Python scripts. Usage: npx tsx scripts/dump-needles.ts > out.json */
import { loadDataset } from './_load';
const d = loadDataset();
const sec = Object.fromEntries(d.sections.map((s) => [s.id, s.name]));
process.stdout.write(JSON.stringify(d.needles.map((n) => ({ id: n.id, name: n.name, alt: n.alternativeNames, pages: n.bookReferences.map((b) => b.page), section: sec[n.sectionId], merged: (n.mergedParts ?? []).map((p) => p.name) }))));
