# OCR del llibre

- Requereix `tesseract-ocr` + `tesseract-ocr-cat` i `poppler-utils`.
- `python3 scripts/ocr-book.py` → `data/ocr/pages/pNNN.txt|tsv` (300 dpi, `--psm 4`).
- `python3 scripts/segment-ocr.py` → `data/ocr/descriptions.json` i `report.csv`: talla el text per agulla
  (capçalera en MAJÚSCULES + semir), uneix pàgines, treu números de pàgina i paràgrafs llegits amb confiança < 60 (mapes/dibuixos).
- Estats: `ok`, `end-uncertain`, `heading-not-found`, `dropped-noise`.
- `data/ocr/` és ignorat per git (text amb drets d'autor). El text OCR sempre es mostra com a «sense revisar»;
  la revisió humana es fa amb `review correct --description-file`.
