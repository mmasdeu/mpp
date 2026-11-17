import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { needlesToGeoJSON } from '../src/lib/geography/geojson';
const rd = (f: string) => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), 'utf8'));
const fc = needlesToGeoJSON({ regions: rd('regions'), sections: rd('sections'), needles: rd('needles') });
mkdirSync(new URL('../static/generated/', import.meta.url), { recursive: true });
writeFileSync(new URL('../static/generated/needles.geojson', import.meta.url), JSON.stringify(fc));
console.log(`needles.geojson: ${fc.features.length} geolocated needles`);
