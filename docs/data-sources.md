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

### Geolocation status (2026-11-18)
Source: OpenStreetMap contributors (ODbL), Overpass Turbo export of `natural=peak|rock|stone|cliff` named nodes in the massif bounding box
(`data/source/geolocation/montserrat-osm.geojson`, 541 features). **200 of 484 candidate needles are located** (all `approximate`).
- 188 by name: exact normalised-name matches win; variants ("A o B", "(Roca 12)", alternative names) are used only when no exact match exists.
- 12 by hand (`data/source/geolocation/manual-matches.csv`): OCR spelling differences in the book extraction ("Deis" = "dels"), a Semir-number agreement (OSM `CodiSemir` 239 = book 239), or an unambiguous long/short name pair.
- A needle claimed by several OSM nodes (e.g. *La Triple* = three OSM rocks 430/431/432; *Roques dels Falcons* = four) is **left unlocated** rather than guessed.
- `data/source/geolocation/unmatched-osm.csv`: the 353 OSM rows not applied, with reason and suggestions (many are not needles in the book — turons, summits, route points).
- Checks: all coordinates fall inside the massif; the 4 OSM Semir numbers that could be compared agree with the book's.
Remaining 284 needles have no coordinates; positions are name-matched, not field-verified. Spot-check before marking anything `verified`.

### Geolocation, second pass (2026-11-19): ICGC toponymy + book structure
The 200 of the first pass is a coincidence (188 name matches + 12 by hand, out of 541 OSM nodes); the check below found no located needle
far from the rest of its section.

`scripts/geolocate.py` proposes coordinates for the needles that still have none:
- **Sources**: the ICGC 1:5.000 toponymy (CC BY 4.0), queried with the ICGC geocoder for every unlocated needle name
  (`data/source/geolocation/icgc-geocoder-2026-11-19.json`, 1144 places), and the OSM export above (incl. `CodiSemir` and names such as
  "Roca 407" or "(Roca 417)", which are Semir numbers).
- **Names**: OCR slips fixed (Deis→dels, Esouerra→Esquerra…), articles ignored, "Serrat"≈"Serra", and a core name without the generic
  head ("Roca de la Prenyada" ≈ "la Prenyada"). A col, canal, cova, font… named like the needle is never taken for the needle; names relative
  to something else ("Roca de sobre…", "sota la cota 209") and names of chapels ("Agulla de Santa Cecília") only go to review.
- **Book structure as a check**: the book walks through each section, so a candidate must lie within 650 m of a located needle of the
  same section (1200 m of the region when the section has none). With several places of the same name, the one that fits the section wins
  only if it is clearly the closest. One place → one needle (a "Merlet/Pedestal de X" may share X's place).
- **Result**: 115 needles located (315/569); 56 more have candidates in `geolocate-review.csv` / `.json`, shown in the editor as
  "Llocs possibles (a revisar)" (click one to place the pin there, adjust, save). All new records are `approximate`, with the evidence in `note`.
- Applied with `node scripts/migrations/004-geolocate.mjs` (adds only needles without a location and whose name matches).
