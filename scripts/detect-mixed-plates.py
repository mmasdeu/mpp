#!/usr/bin/env python3
"""Find drawings printed on pages that also carry running text (a plate under a paragraph, e.g. "EL SABRE / Via Normal" on p.15).
Usage: detect-mixed-plates.py "Montserrat Pam a Pam.pdf"
Method: render at 100 dpi, paint every confidently OCR'd word white (that is text), keep the remaining ink, merge it with a large dilation
and take the biggest blob = the drawing. The caption (uppercase OCR lines just above it) is where the crop starts.
Outputs:
  data/source/drawings-crops.json  {page: [top, bottom]} fractions of the page height that crop-drawings.py keeps (only mixed pages) + the caption read from the OCR
  data/ocr/mixed-plates-report.csv page, crop, caption, proposed needle, why  (candidates NOT yet in data/drawings.json come first)
Pages already in data/drawings.json that are mixed also get a crop, so their cutout no longer includes the paragraph above."""
import csv, glob, json, os, re, subprocess, sys, tempfile
import cv2, numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from needles_lib import load_needles
import importlib.util
pdf = sys.argv[1]
drawings = json.load(open(os.path.join(ROOT, "data/drawings.json")))
have = {p for v in drawings.values() for p in v}
maps = json.load(open(os.path.join(ROOT, "data/maps.json")))
map_pages = {p for k in maps for v in maps[k].values() for p in v}
needles = load_needles()

def words(p):
    out = []
    for r in csv.reader(open(os.path.join(ROOT, "data/ocr/pages", f"p{p:03d}.tsv"), encoding="utf-8"), delimiter="\t", quoting=csv.QUOTE_NONE):
        if len(r) >= 12 and r[0] == "5" and r[11].strip():
            try: out.append((int(r[6]), int(r[7]), int(r[8]), int(r[9]), float(r[10]), r[11].strip(), int(r[2]), int(r[4])))
            except ValueError: pass
    return out
def page_size(p):
    for r in csv.reader(open(os.path.join(ROOT, "data/ocr/pages", f"p{p:03d}.tsv"), encoding="utf-8"), delimiter="\t", quoting=csv.QUOTE_NONE):
        if len(r) >= 12 and r[0] == "1": return int(r[8]), int(r[9])

rows, crops = [], {}
with tempfile.TemporaryDirectory() as t:
    subprocess.check_call(["pdftoppm", "-r", "100", "-gray", "-png", pdf, os.path.join(t, "x")])
    for p in range(5, 410):
        f = os.path.join(t, f"x-{p:03d}.png")
        if not os.path.exists(f) or p in map_pages: continue
        g = cv2.imread(f, cv2.IMREAD_GRAYSCALE); h, w = g.shape
        ow, oh = page_size(p); sx, sy = w / ow, h / oh
        bg = cv2.resize(cv2.medianBlur(cv2.resize(g, (w // 4, h // 4)), 15), (w, h))
        alpha = np.clip((215 - np.clip(g.astype(np.float32) / np.maximum(bg, 1) * 255, 0, 255)) / (215 - 70), 0, 1)
        ink = (alpha > 0.3).astype(np.uint8)
        W = words(p)
        for (l, tp, wd, ht, conf, txt, blk, ln) in W:                                   # text → erased
            if conf >= 60 and len(txt) >= 2 and re.search(r"[A-Za-zÀ-ú]{2}", txt):
                x0, y0, x1, y1 = int(l * sx) - 3, int(tp * sy) - 3, int((l + wd) * sx) + 3, int((tp + ht) * sy) + 3
                ink[max(y0, 0):y1, max(x0, 0):x1] = 0
        ink[int(.93 * h):, :] = 0; ink[:int(.04 * h), :] = 0                          # folio / running head
        n, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(ink, np.ones((25, 25), np.uint8)))
        best = None
        for i in range(1, n):
            x, y, cw, chh, area = st[i]
            inkpx = int(ink[lab == i].sum())
            if best is None or inkpx > best[0]: best = (inkpx, x, y, cw, chh)
        if not best: continue
        inkpx, x, y, cw, chh = best
        if chh < .12 * h or cw * chh < .03 * w * h or inkpx < .004 * w * h: continue   # no drawing (text page)
        inside = sum(1 for q in W if len(q[5]) >= 3 and re.search(r"[A-Za-zÀ-ú]{3}", q[5]) and x <= (q[0] + q[2] / 2) * sx <= x + cw and y <= (q[1] + q[3] / 2) * sy <= y + chh)
        if inside > 22 or (inside > 8 and inkpx / (cw * chh) < .056): continue                                                       # a block of low-confidence text, not a drawing
        capW, topW = [], y                                                           # caption from the page OCR (cheap, usually right)
        for (l, tp, wd, ht, conf, txt, blk, ln) in W:
            ty = tp * sy
            if conf >= 40 and len(re.sub(r"[^A-ZÀ-Ú]", "", txt)) >= 4 and y - .11 * h <= ty + ht * sy <= y + .02 * h and re.search(r"[A-ZÀ-Ú]{3}", txt) and txt.upper() == txt and not re.fullmatch(r"[IVXL]+\W*", txt): capW.append((round(ty / (.012 * h)), l, txt)); topW = min(topW, ty)
        capW.sort(); capW = " ".join(c[2] for c in capW)
        # caption: uppercase lines just above the drawing, read by OCR on a 300 dpi band (the title is often missing from the page OCR)
        top_y, cap = y, []
        with tempfile.TemporaryDirectory() as t2:
            subprocess.check_call(["pdftoppm", "-r", "300", "-gray", "-png", "-f", str(p), "-l", str(p), pdf, os.path.join(t2, "b")])
            big = cv2.imread([os.path.join(t2, q) for q in os.listdir(t2)][0], cv2.IMREAD_GRAYSCALE); k = big.shape[0] / h
            b0 = int(max(y - .12 * h, 0) * k); b1 = int((y + .035 * h) * k)
            cv2.imwrite(os.path.join(t2, "band.png"), big[b0:b1])
            out = subprocess.run(["tesseract", os.path.join(t2, "band.png"), "-", "-l", "cat", "--psm", "6", "tsv"], capture_output=True, text=True, env={**os.environ, "OMP_THREAD_LIMIT": "1"}).stdout
        lines = {}
        for r in out.split("\n")[1:]:
            c = r.split("\t")
            if len(c) >= 12 and c[0] == "5" and c[11].strip() and float(c[10]) > 30: lines.setdefault(tuple(c[2:5]), []).append((int(c[6]), int(c[7]), int(c[9]), c[11].strip()))
        for ws in lines.values():
            txt = " ".join(q[3] for q in sorted(ws)); letters = re.sub(r"[^A-Za-zÀ-ú]", "", txt)
            if len(letters) >= 3 and sum(ch.isupper() for ch in letters) >= .8 * len(letters) and not re.fullmatch(r"[IVXL]+\W*", txt):
                cap.append((min(q[1] for q in ws), txt)); top_y = min(top_y, (b0 + min(q[1] for q in ws)) / k)
        cap.sort(); capB = " ".join(re.sub(r"^\W+|\W+$", "", c[1]) for c in cap)
        caption = capW or capB; captions_all = [c for c in (capW, capB) if c]
        if capW: top_y = topW
        around = sum(1 for q in W if q[4] > 70 and len(q[5]) > 2 and ((q[1] + q[3]) * sy < top_y - .01 * h or q[1] * sy > y + chh + .01 * h))   # running text above / below the drawing
        lines_ = {}                                                                   # body text above the drawing (lines of ≥ 5 confident words) is never part of the crop
        for q in W:
            if q[4] > 70 and len(q[5]) > 1 and (q[1] + q[3]) * sy < y: lines_.setdefault((q[6], q[7]), []).append(q)
        body = [max((q[1] + q[3]) * sy for q in ws) for ws in lines_.values() if len(ws) >= 5 and any(q[5].islower() for q in ws)]
        if body and top_y <= max(body) + .004 * h: top_y = max(y, max(body) + .004 * h)   # the 'caption' was a body line: start at the drawing itself
        top = max(top_y - .012 * h, 0) / h; bottom = min(y + chh + .012 * h, h) / h
        nwords = sum(1 for q in W if q[4] > 70 and len(q[5]) > 2)
        crops[p] = {"top": round(top, 4), "bottom": round(bottom, 4), "caption": caption, "captions": captions_all}
        pagetxt = " ".join(q[5] for q in W)
        kind = "map" if re.search(r"REGI[ÓO]|escala 1|SECCI[ÓO]", pagetxt) else "plate" if around < 12 else "mixed"
        rows.append([p, kind, p in have, f"{top:.3f}-{bottom:.3f}", caption, nwords, f"{cw / w:.2f}x{chh / h:.2f}"])
rows.sort(key=lambda r: (r[2], r[0]))
with open(os.path.join(ROOT, "data/ocr/mixed-plates-report.csv"), "w", newline="", encoding="utf-8") as fh:
    wr = csv.writer(fh); wr.writerow(["page", "kind", "already_assigned", "crop_top-bottom", "caption", "text_words", "drawing_size"]); wr.writerows(rows)
mixed = {str(r[0]): crops[r[0]] for r in rows if r[1] == "mixed"}
json.dump(dict(sorted(mixed.items(), key=lambda kv: int(kv[0]))), open(os.path.join(ROOT, "data/source/drawings-crops.json"), "w"), indent=1)
print(len(rows), "pages with a drawing blob;", len(mixed), "mixed;", sum(1 for r in rows if r[1] == "mixed" and not r[2]), "mixed not yet assigned")
