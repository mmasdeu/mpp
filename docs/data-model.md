# Data model

The canonical data lives in `data/` as JSON. It describes six entities.

## Entities

- **Region**: a broad territory of Montserrat as organised in the book.
- **Section**: a text section of the book, linked to one or more regions.
- **Needle**: a point of interest (a "needle", the book's term for a notable spot), with a location.
- **ImageReference**: a pointer to an image related to an entity. Stores the reference only, not the image file.
- **BookReference**: a citation of a page or passage in the book.
- **GeographicalFeature**: a natural or built feature (peak, valley, path, building) that entities can refer to.

## Stable IDs

- Every entity has an ID that never changes, for example `r01` (Region), `s01` (Section), `n0001` (Needle).
- IDs are **independent of names**. Renaming a place or correcting its Catalan spelling must not change its ID.
- IDs are never reused, even after an entity is removed.
- Cross-references between entities use IDs only.

## Coordinates

Each coordinate carries:

- `lat` and `lon` in WGS 84
- `provenance`: where the coordinate came from (for example, the book, a map, a manual reading)
- `accuracy`: a stated level of precision, with an explicit "unknown" value when it is not established

A coordinate with unknown provenance is allowed only when it is marked as such. It is never presented as verified.

## Original text and editorial content

- Text taken from the book is stored in a field that holds the **original text** only.
- Editorial material (summaries, translations, notes, corrections) is stored in separate fields and marked as editorial.
- The two are never merged in one field.

## Missing information

- Missing values are stored as explicit `null` with a reason where possible, or with an explicit status field.
- Missing information is **never invented**. No coordinate, date, name or reference is filled in to make a record look complete.
- Validation reports missing fields as warnings so they stay visible.

## Relationships

- Section to Region, Needle to Region and Section, and similar links are stored by ID.
- Each ImageReference and BookReference points to its owning entity by ID.
- GeographicalFeature links to Needles and Regions by ID.
