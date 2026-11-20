# Book page images

Until the text is properly OCR'd and reviewed, every needle page shows the scanned page(s) of *Montserrat pam a pam* it comes from,
next to the needle's data (sticky column on desktop, first on mobile).

- **Render:** `python3 scripts/render-book-pages.py "Montserrat Pam a Pam.pdf"` → `static/images/book/pNNN.webp`
  (409 pages, grayscale, 698×1071, ~65 kB each, ~25 MB total; needs `pdftoppm` and Pillow).
- **Which pages:** `scripts/build_data.py` gives each needle its heading page plus the following page(s) up to the page where the next entry starts
  (max 3). Pages after the first are marked *estimada* in the UI. In this edition printed page = PDF page.
- **Build flag:** `vite.config.ts` sets `__BOOK_IMAGES__` when `static/images/book/p010.webp` exists at build time. Without the images the
  page shows "pàgina X de *Montserrat pam a pam*" instead of the picture; nothing breaks.
- **Rights:** the page images are copyrighted (Publicacions de l'Abadia de Montserrat, 1977). `static/images/book/` is **git-ignored on purpose**, so the
  GitHub Pages deployment (built in CI without the images) does not publish them. Local builds and offline use work. Publishing them requires permission from
  the rights holder (see `docs/data-sources.md`); only then remove the ignore rule or host the images privately.
- **Offline:** images are cached as you view them (cap 150). The service worker never precaches them.
- **Next:** when a page's text is OCR'd and reviewed, put it in the needle's `description`; the image stays as the authoritative source.

## Dibuixos (làmines)
`python3 scripts/match-drawings.py` detecta les pàgines de làmina (títol tipus «EL LLORO -139-» i gairebé sense text) i les assigna a
agulles pel nom i el número de Semir (distància ≤ 15 pàgines). Resultat: `data/drawings.json` (només números de pàgina) i
`data/ocr/drawings-report.csv` (tot el que s'ha vist, també els títols sense assignar, per revisar a mà). La fitxa mostra el dibuix abans de les pàgines de text.
Limitacions: coincidència conservadora (agulles absents de l'extracció, com La Bandereta, no tenen dibuix) i capçaleres mal llegides per l'OCR queden sense assignar.

### Dibuixos retallats i transparents
`python3 scripts/crop-drawings.py "Montserrat Pam a Pam.pdf"` renderitza a 300 dpi cada làmina, en treu el paper (el traç negre queda
a l'alfa, de manera que el dibuix s'integra sobre qualsevol fons), elimina taques i el foli, i retalla → `static/images/drawings/dNNN.webp`
(WebP sense pèrdua amb alfa, ~11 MB en total; git-ignorat, drets d'autor). Si no hi són, la fitxa mostra la pàgina escanejada sencera.
**Làmines amb text a la mateixa pàgina** (p. ex. «EL SABRE» sota un paràgraf, p. 15): `python3 scripts/detect-mixed-plates.py "Montserrat Pam a Pam.pdf"`
troba el dibuix (tot el que no és text OCR, fusionat) i el títol en majúscules just a sobre, i escriu `data/source/drawings-crops.json`
(`{pàgina: {top, bottom, captions}}`, fraccions d'alçada). `match-drawings.py` hi llegeix els títols per assignar-les i `crop-drawings.py` hi retalla
el text de dalt i de baix. Informe per revisar (també làmines sense assignar, panoràmiques i mapes): `data/ocr/mixed-plates-report.csv`.
Ordre: `detect-mixed-plates.py` → `match-drawings.py` → `crop-drawings.py`.

Correccions manuals de l'assignació: `data/source/drawings-manual.csv` (page, needle_id, add|remove, motiu).
Limitació: l'interior de la roca també és transparent (és dibuix de línia), i algun títol de làmina pot quedar tallat.

## Mapes de secció i textos d'introducció
- `python3 scripts/match-maps.py` assigna cada mapa (pàgina amb brúixola i etiquetes, peu «SECCIÓ VI») a la seva secció pel número romà de
  l'OCR i la proximitat a la primera pàgina de la secció; les excepcions són a `data/source/maps-manual.csv` (lectures d'OCR fallides,
  peus impresos de costat…). Sortida: `data/maps.json` (+ el mapa general de regió d'Agulles, p. 9). Els mapes es retallen amb
  `scripts/crop-drawings.py` (els impresos de costat es giren: constant `ROTATE`) i es mostren a la pàgina de la secció/regió.
- `python3 scripts/segment-intros.py` extreu el text d'introducció de cada secció (després de «Secció sisena - Frares», fins a la primera agulla) i de
  cada regió (des de «REGIÓ D'AGULLES» fins a la primera secció següent) → `data/ocr/intros.json` (git-ignorat). Es mostra com a «Text OCR sense revisar».
- `segment-ocr.py` ara talla el text d'una agulla en trobar la capçalera d'una secció o regió, salta les pàgines de mapa/dibuix intercalades,
  i arriba fins a la capçalera de l'agulla següent (fins a 8 pàgines), en comptes de les 3 pàgines estimades.

## Pàgines inicials (pp. 5–7)

`data/front.json` llista el que es mostra a la pàgina d'inici: l'«Advertiment» (pp. 5–6; OCR amb `scripts/segment-front.py` →
`data/ocr/front.json`; transcripció revisada a `data/review/front.json`, editable des de `data/textos.json`) i el mapa general (p. 7).
Les pp. 1–4 (portades i crèdits) queden fora.

## Nomenclàtor (pp. 398–405)

`scripts/check-nomenclator.py "Montserrat Pam a Pam.pdf"` llegeix l'índex columna per columna i comprova que cada entrada (nom + pàgina)
correspon a una agulla que cita aquella pàgina. Resultat: `data/ocr/nomenclator-informe.csv` (igual / nom diferent / en una altra
pàgina / no trobada) i `data/ocr/nomenclator.json`. A `data/front.json` l'índex consta com a `"kind": "index"`.

## Navegador del llibre (`/llibre/`)

Les 409 pàgines escanejades, una per pantalla: es passen lliscant (carrusel amb *scroll-snap*), amb les fletxes, el número o la barra.
Al costat (o a sota, al mòbil) hi ha el que la web té d'aquella pàgina (`src/lib/data/book-index.ts`): agulles que hi comencen o hi
continuen, dibuixos, seccions i regions (introducció i plànol), panoràmiques, biografies i l'Advertiment. L'adreça `/llibre/?p=123`
obre una pàgina concreta. Només es carreguen les imatges de les pàgines properes.
