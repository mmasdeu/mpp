# Architecture

## Overview

Montserrat Pam a Pam is a **static app**. The whole site is built ahead of time and served as plain files. There is no backend, no database and no server-side rendering at request time. The browser loads the prerendered HTML, the generated data files and the map tiles, and runs everything else on the client.

## Data pipeline

Data flows in one direction:

```
data/source/            original extraction of the book (read-only)
      |
      v
normalized JSON         canonical data in data/ (validated against the schema)
      |
      v
generated GeoJSON       map layers, plus the search index
      |
      v
SvelteKit prerender     static HTML, JS, CSS and data files in the build output
```

1. **Source.** `data/source/` contains the original extraction of the book. It is the starting point for provenance and is never edited.
2. **Normalized JSON.** The extraction is turned into canonical JSON in `data/`, following the [data model](data-model.md). Stable IDs are assigned here.
3. **Generated artifacts.** Scripts derive GeoJSON layers for MapLibre and a search index from the canonical JSON. These files are generated, never hand-edited.
4. **Prerender.** SvelteKit prerenders every route into static files. The output is what gets deployed.

## Quality gates

- `npm run validate` checks the canonical JSON against the schema and the rules in the data model (IDs, coordinates, references).
- `npm test` runs the test suite.
- `npm run build` produces the static output.

A failure at any stage stops the pipeline.

## Runtime

- MapLibre GL renders the base map from an external tile provider and the generated GeoJSON layers.
- Search runs in the browser against the prebuilt index.
- A service worker makes the static shell installable as a PWA.

## Constraints

- All paths must work under a configurable base path (see [deployment](deployment.md)).
- No runtime network calls to project services; the only external request is for map tiles.
- Generated files are reproducible from `data/` alone.

## Pages (Sprint 2)
`/` regions · `/regions/[slug]/` · `/sections/[id]/` · `/needles/[id]/` · `/search/?q=` · `/map/?needle=&region=&section=&q=&geo=`.
All are prerendered from the same canonical dataset (raw extraction + review decisions + locations). Map filters, selection and the
text list share one URL state; markers do not wait for basemap tiles, and ungeolocated needles stay reachable through the list.
E2E tests: `npm run test:e2e` (Playwright).
