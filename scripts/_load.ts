import { readFileSync } from 'node:fs';
import { applyLocations } from '../src/lib/data/merge';
import { applyReview, type Decision } from '../src/lib/data/review';
import { applyAdditions } from '../src/lib/data/additions';
import { applyStructure } from '../src/lib/data/structure';
import { applyAltNames } from '../src/lib/data/alt-names';
import { applyFixes } from '../src/lib/data/fixes';
import { existsSync } from 'node:fs';
import type { Dataset } from '../src/lib/data/types';
export const dataUrl = (f: string) => new URL(`../data/${f}`, import.meta.url);
export const rd = <T = any>(f: string): T => JSON.parse(readFileSync(dataUrl(f), 'utf8'));
export const rawDataset = (): Dataset => applyFixes(applyAdditions({ regions: rd('regions.json'), sections: rd('sections.json'), needles: rd('needles.json') }, rd('review/additions.json')), existsSync(dataUrl('review/fixes.json')) ? rd('review/fixes.json') : {});
/** Raw extraction + review decisions + locations: what the application actually shows. */
export const loadDataset = (): Dataset => applyAltNames(applyLocations(applyStructure(applyReview(rawDataset(), rd('review/decisions.json')), rd('review/structure.json')), rd('locations.json')), existsSync(dataUrl('review/alt-names.json')) ? rd('review/alt-names.json') : {});
