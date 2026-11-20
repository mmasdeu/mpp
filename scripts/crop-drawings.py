#!/usr/bin/env python3
"""Crop each drawing plate (data/drawings.json) and section/region map (data/maps.json) out of its book page and make the paper transparent.
Usage: crop-drawings.py "Montserrat Pam a Pam.pdf"   -> static/images/drawings/dNNN.webp (RGBA, black ink on transparent, lossless)
Method: 300 dpi render; alpha = ink darkness (paper -> 0, so scan grain and the page tint disappear), specks removed,
page numbers/folios removed, bounding box of the remaining ink + margin. Output is copyrighted -> git-ignored."""
import json, os, subprocess, sys, tempfile
import cv2, numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf = sys.argv[1]; out = os.path.join(ROOT, "static/images/drawings"); os.makedirs(out, exist_ok=True)
pages = {p for v in json.load(open(os.path.join(ROOT, "data/drawings.json"))).values() for p in v}
maps = json.load(open(os.path.join(ROOT, "data/maps.json")))                                         # section/region maps are cut out the same way
pages |= {p for k in maps for v in maps[k].values() for p in v}
panos = json.load(open(os.path.join(ROOT, "data/book-panoramas.json")))                           # panoramic views of a region (data/book-panoramas.json): one or two facing pages
pages |= {p for pano in panos for p in pano["pages"]}
pages |= {p for f in json.load(open(os.path.join(ROOT, "data/front.json"))) if f.get("kind") == "map" for p in f["pages"]}   # general map (home page)
pages = sorted(pages)
# pages with running text above/below the drawing: cut with data/source/drawings-crops.json (detect-mixed-plates.py); TITLE_CUT = manual override: everything above the first word matching the title is dropped
TITLE_CUT = {223: 'REGIÓ'}
CROPS = json.load(open(os.path.join(ROOT, "data/source/drawings-crops.json")))   # mixed pages (text + drawing): {page: {top, bottom}} as page-height fractions, from detect-mixed-plates.py
# region panoramas printed below running text (not found by detect-mixed-plates.py): measured on the scans, page-height fractions
CROPS.update({"123": {"top": 0.465, "bottom": 0.886}, "257": {"top": 0.575, "bottom": 0.905}, "358": {"top": 0.545, "bottom": 0.905},
              "362": {"top": 0.515, "bottom": 0.99}})   # 362: route drawing of the Tossal de Mullapans below the text
ROTATE = {336: 1, 192: 1, 364: 1, 334: 1, 217: 1, 256: 1}   # maps printed sideways on the page: quarter turns counter-clockwise (checked on the scans)
placed = {}                                                                                      # page -> (alpha crop, y0, x0 in page pixels), to join facing pages
for p in pages:
    with tempfile.TemporaryDirectory() as t:
        subprocess.check_call(["pdftoppm", "-r", "300", "-gray", "-png", "-f", str(p), "-l", str(p), pdf, os.path.join(t, "x")])
        g = cv2.imread([os.path.join(t, f) for f in os.listdir(t)][0], cv2.IMREAD_GRAYSCALE)
    if p in ROTATE: g = np.ascontiguousarray(np.rot90(g, ROTATE[p]))
    h, w = g.shape
    cut_y = 0
    if p in TITLE_CUT:
        import csv
        for r in csv.reader(open(os.path.join(ROOT, "data/ocr/pages", f"p{p:03d}.tsv"), encoding="utf-8"), delimiter="\t", quoting=csv.QUOTE_NONE):
            if len(r) >= 12 and r[0] == "5" and r[11].strip().upper().startswith(TITLE_CUT[p]): cut_y = max(int(r[7]) - 15, 0); break
    bg = cv2.medianBlur(cv2.resize(g, (w // 8, h // 8)), 21); bg = cv2.resize(bg, (w, h))          # uneven paper tint
    norm = np.clip(g.astype(np.float32) / np.maximum(bg, 1) * 255, 0, 255)
    alpha = np.clip((215 - norm) / (215 - 70), 0, 1)                                                 # paper 215+ -> 0, ink <=70 -> 1
    ink = (alpha > 0.2).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(ink, np.ones((9, 9), np.uint8)))
    keep = np.zeros_like(ink)
    for i in range(1, n):
        x, y, cw, ch, area = st[i]
        folio = ch < 0.04 * h and cw < 0.12 * w and (y > 0.9 * h or y < 0.05 * h)                    # page number
        if area < 0.00012 * w * h or folio: continue                                                  # specks, folios
        keep[lab == i] = 1
    m = cv2.dilate(keep, np.ones((9, 9), np.uint8)) > 0
    alpha[~m] = 0
    alpha[:cut_y] = 0
    if str(p) in CROPS:
        alpha[:int(CROPS[str(p)]["top"] * h)] = 0; alpha[int(CROPS[str(p)]["bottom"] * h):] = 0
    ys, xs = np.where(alpha > 0.5)
    pad = 20; y0, y1, x0, x1 = max(ys.min() - pad, 0), min(ys.max() + pad, h), max(xs.min() - pad, 0), min(xs.max() + pad, w)
    a = (alpha[y0:y1, x0:x1] * 255).astype(np.uint8)
    rgba = np.zeros((*a.shape, 4), np.uint8); rgba[..., 3] = a                                       # black ink, alpha carries the drawing
    placed[p] = (a, y0, x0)
    Image.fromarray(rgba, "RGBA").save(os.path.join(out, f"d{p:03d}.webp"), lossless=True, method=6)
    print(p, a.shape[::-1], os.path.getsize(os.path.join(out, f"d{p:03d}.webp")) // 1024, "KB")

# panoramas: the cut-out of each page placed at its own height (so the ridge line continues), pages side by side without the gutter margins
for pano in panos:
    parts = [placed[p] for p in pano["pages"]]
    top = min(y0 for _, y0, _ in parts); bottom = max(y0 + a.shape[0] for a, y0, _ in parts)
    W = sum(a.shape[1] for a, _, _ in parts); canvas = np.zeros((bottom - top, W), np.uint8); x = 0
    for a, y0, _ in parts:
        canvas[y0 - top:y0 - top + a.shape[0], x:x + a.shape[1]] = a; x += a.shape[1]
    rgba = np.zeros((*canvas.shape, 4), np.uint8); rgba[..., 3] = canvas
    Image.fromarray(rgba, "RGBA").save(os.path.join(out, f"pano-{pano['id']}.webp"), lossless=True, method=6)
    print("pano", pano["id"], canvas.shape[::-1])
