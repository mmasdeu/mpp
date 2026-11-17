import { readFileSync } from 'node:fs';
import { applyLocations } from '../src/lib/data/merge';
import { applyReview, type Decision } from '../src/lib/data/review';
import type { Dataset } from '../src/lib/data/types';
export const dataUrl = (f: string) => new URL(`../data/${f}`, import.meta.url);
export const rd = <T = any>(f: string): T => JSON.parse(readFileSync(dataUrl(f), 'utf8'));
export const rawDataset = (): Dataset => ({ regions: rd('regions.json'), sections: rd('sections.json'), needles: rd('needles.json') });
/** Raw extraction + review decisions + locations: what the application actually shows. */
export const loadDataset = (): Dataset => applyLocations(applyReview(rawDataset(), rd('review/decisions.json')), rd('locations.json'));
