// Expected counts, computed from the data in the repo, so the e2e tests do not break when entries are added, merged or rejected.
import { loadDataset, rd } from '../../scripts/_load';

const d = loadDataset();
const kinds = rd<Record<string, string>>('review/kinds.json');
const kindOf = (n: { id: string; kind?: string }) => n.kind ?? kinds[n.id];
const count = (f: (n: (typeof d.needles)[number]) => boolean) => d.needles.filter(f).length;

export const COUNT = {
	total: d.needles.length,
	located: count((n) => !!n.location),
	unlocated: count((n) => !n.location),
	avenc: count((n) => kindOf(n) === 'avenc'),
	cova: count((n) => kindOf(n) === 'cova'),
	itinerari: count((n) => kindOf(n) === 'itinerari'),
	needle: count((n) => !kindOf(n)),
	inSection: (id: string) => count((n) => n.sectionId === id)
};
export const agulles = (n: number) => `${n} agulles`;
