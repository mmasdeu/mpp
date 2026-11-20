# Sincronització entre còpies (política A)

La còpia **local** (`~/Claude/montserrat`) és la que mana per a les dades editables; l'editor hi escriu directament.
La còpia del núvol (on es desenvolupa el codi) **no** sobreescriu mai aquests fitxers:

- `data/review/` (decisions, introduccions revisades, estructura)
- `data/locations.json`, `data/drawings.json`, `data/maps.json`
- `data/source/*-manual.csv` (drawings, maps, geolocation)

`scripts/make-sync.sh out.tar.gz` empaqueta només codi, scripts, tests, docs i configuració (sense `data/` ni imatges) i es desempaqueta amb
`tar xzf out.tar.gz --strip-components=1 --overwrite`. Els canvis de forma de dades (fitxers nous) s'expliquen a part i s'apliquen amb una
migració o a mà. Les dades generades (`data/ocr/`) es regeneren localment amb els scripts de `scripts/`.
Treballeu les dades amb git local (`git diff data/`, un commit per sessió d'edició).
