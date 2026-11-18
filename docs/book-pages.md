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
