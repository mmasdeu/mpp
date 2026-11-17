# Panoramas and observation points

`data/panoramas.json` and `data/observations.json` are empty until real, rights-cleared images exist (see `docs/data-sources.md`).
No placeholder annotations are shipped: every annotation must be placed by a person against a real image.

## Adding a panorama
1. Put the image (WebP/JPEG) in `static/images/panoramas/`.
2. Open `tools/annotate.html` in a browser (works offline). Choose the image and `data/needles.json`, click each needle, pick it by name or ID,
   fill id/title/author/source/license/date/observation point/viewing direction, then **Exporta JSON**.
3. Append the exported object to `data/panoramas.json`; add the viewpoint to `data/observations.json`
   (`location` needs `source` and `accuracy`; leave unverified positions as `approximate`).
4. `npm run validate`: errors for unknown needles, annotations outside the image, missing image files or unknown observation points;
   warnings for missing provenance, unverified viewpoints and `unreviewed` status.

Annotation positions are fractions of the image (0–1), so they survive zoom and resizing. Set `status` to `reviewed` only after
checking every pin against the image. Needles removed by review decisions must also be removed from annotations (validation fails otherwise).
The panorama page offers zoom, tappable numbered pins and a text list of the same needles; each needle page links back to its panoramas.
