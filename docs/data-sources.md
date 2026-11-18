# Data sources

This table lists every external source the project uses or may use. Each entry must be filled in and verified before the site is published.

| Source | License | Usage |
|--------|---------|-------|
| Josep Barbera, *Pam a Pam* (book, PDF) | TBD: to be verified | Source of sections, needles, references and text. Original extraction in `data/source/`. |
| Map tile provider (TBD) | TBD: to be verified | Base map tiles shown through MapLibre GL. |
| Map data (OpenStreetMap or equivalent, TBD) | TBD: to be verified (ODbL for OSM) | Geographic context and feature geometry, if used. |
| Photographs (TBD) | TBD: to be verified | Images referenced through ImageReference. |
| Sample data | Project-internal | PLACEHOLDER only. Not from the book. Replace after PDF extraction. |

## Attribution

- The map tile provider's attribution must be displayed on the map, in the form the provider requires. The exact text is to be confirmed for the chosen provider.
- Map data attribution, if OpenStreetMap or another source is used, must be shown as its licence requires.

## Copyright checks before publication

- **Book text and images**: the copyright status of *Pam a Pam* and of any extracted text must be verified before publication. Quoting, summarising and reproducing are separate questions, and each needs a decision.
- **Photographs**: each photo needs a known licence or the author's written permission, with credit recorded.
- **Sample data**: placeholder content must be removed or clearly marked before any public release.

Until these checks are complete, the site must not be deployed publicly.

## Geolocation workflow

Coordinates live in `data/locations.json` (overlay; `needles.json` is never edited). Add them with
`npx tsx scripts/import-locations.ts <file.csv|gpx> --source "<provenance>" [--accuracy approximate|verified]`.
Matching is by `needle_id` or exact normalised name; ambiguous or unmatched rows are reported, never guessed.
Every record needs `source` and `accuracy`. Overpass/OSM could not be fetched automatically (robots policy); provide an export or GPX instead.

### Getting coordinates from OpenStreetMap (free, ODbL)
Automated fetching of Overpass was not possible from the build environment, so export it yourself (one minute):
1. Open <https://overpass-turbo.eu>, paste, and **Run**:
   ```
   [out:json][timeout:60];
   node["natural"~"peak|rock|stone|cliff"]["name"](41.57,1.75,41.64,1.87);
   out;
   ```
2. **Export → GeoJSON → download**, save as `montserrat-osm.geojson`.
3. `npx tsx scripts/import-locations.ts montserrat-osm.geojson --source "OpenStreetMap contributors (ODbL)" --report unmatched.csv`
   – exact normalised-name matches (also via `alt_name` / `name:ca`) are written with the OSM id in the source; the rest go to `unmatched.csv` with fuzzy suggestions.
4. Open `unmatched.csv`, fill `needle_id` for rows you confirm, then `npx tsx scripts/import-locations.ts unmatched.csv --source "OpenStreetMap contributors (ODbL), manually matched"`.
5. `npm run validate`, then check a sample on the map. OSM attribution ("© OpenStreetMap contributors") must be kept visible wherever its data is used.

Name matches are *name* matches: OSM names differ from the book's (and several rocks share a name), so spot-check, and mark positions `approximate` unless verified in the field.
