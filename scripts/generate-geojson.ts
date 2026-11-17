import { writeFileSync, mkdirSync } from 'node:fs';
import { needlesToGeoJSON } from '../src/lib/geography/geojson';
import { loadDataset } from './_load';
const fc = needlesToGeoJSON(loadDataset());
mkdirSync(new URL('../static/generated/', import.meta.url), { recursive: true });
writeFileSync(new URL('../static/generated/needles.geojson', import.meta.url), JSON.stringify(fc));
console.log(`needles.geojson: ${fc.features.length} geolocated needles`);
