import { dataset } from '$lib/data/loader';
import { needlesToGeoJSON } from './geojson';
/** Located needles as GeoJSON, from the bundled dataset (no network request; reflects editor changes after reload). */
export const needlesGeoJSON = needlesToGeoJSON(dataset);
