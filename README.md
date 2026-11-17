# Montserrat Pam a Pam

An interactive atlas of Montserrat, based on Josep Barbera's book *Pam a Pam*. It places the book's sections, places and features on a map so they can be browsed and searched geographically.

## Stack

- SvelteKit with TypeScript, built as a fully static site (prerendered)
- MapLibre GL for the interactive map
- Installable as a PWA (static, offline-capable shell)
- No backend, no database, no runtime API

## Commands

```sh
npm ci              # install dependencies
npm run dev         # local development server
npm run validate    # check canonical data against the schema and rules
npm test            # run the test suite
npm run build       # validate-independent static build (prerendered output)
```

CI runs `validate`, `test` and `build` on every push and pull request.

## Data

- `data/` holds the **canonical JSON** that the app consumes. Edit data here, not in generated output.
- `data/source/` holds the original extraction of the book. **It is never modified.** Corrections go into the canonical data with a traceable reference back to the source.
- **Sample data is PLACEHOLDER** until the PDF of the book has been extracted. Names, coordinates and texts in the current sample files are not from the book and must not be published or cited as facts.

## Documentation

- [Architecture](docs/architecture.md): how the static app and the data pipeline fit together
- [Data model](docs/data-model.md): entities, IDs, provenance and missing information
- [Data sources](docs/data-sources.md): sources, licences and attribution
- [Editorial policy](docs/editorial-policy.md): how original text and corrections are handled
- [Deployment](docs/deployment.md): GitHub Pages, base path and the deploy gate

## Status

Early development. The data pipeline and the map UI are being built against placeholder data.
