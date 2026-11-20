#!/usr/bin/env python3
"""Cut the page OCR (data/ocr/pages/*.txt, *.tsv) into one text block per needle -> data/ocr/descriptions.json (+ report.csv).

For each needle (book order) the heading is searched on its start page: an ALL-CAPS line (or two joined lines) whose name resembles the
needle name, boosted by a matching Semir number "(115)". The text runs from the line after the heading to the heading of the next needle
(or the end of the needle's last page when that heading is not found). Output is *unreviewed OCR*, never merged into needles.json.
Usage: segment-ocr.py
"""
import csv, difflib, json, os, re, sys, unicodedata

ROOT = os.path.join(os.path.dirname(__file__), "..")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from needles_lib import load_needles
needles = load_needles()
PAGES = os.path.join(ROOT, "data", "ocr", "pages")

def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\b(el|la|els|les|l|de|del|dels|deis|d|en|i|o)\b", " ", s)  # "deis" = OCR of "dels" in the first extraction
    return re.sub(r"\s+", " ", s).strip()

_cache = {}
def page(p):
    """-> (lines, mean word confidence, per-line confidences). Lines come from the TSV (so each has a confidence);
    a '' line separates paragraphs (Tesseract block/paragraph boundaries)."""
    if p not in _cache:
        lines, lconf, allc, cur, prev_par = [], [], [], {}, None
        tsv = os.path.join(PAGES, f"p{p:03d}.tsv")
        rows = []
        if os.path.exists(tsv):
            for r in csv.reader(open(tsv, encoding="utf-8"), delimiter="\t", quoting=csv.QUOTE_NONE):
                if len(r) >= 12 and r[0] == "5" and r[11].strip():
                    try: rows.append((int(r[2]), int(r[3]), int(r[4]), float(r[10]), r[11].strip()))
                    except ValueError: pass
        key = None
        for blk, par, ln, c, w in rows:
            k = (blk, par, ln)
            if k != key:
                if key is not None and (key[0], key[1]) != (blk, par): lines.append(""); lconf.append(100.0)
                lines.append(""); lconf.append(0.0); key = k; words = []
                idx = len(lines) - 1; cs = []
            lines[idx] = (lines[idx] + " " + w).strip(); cs.append(c); lconf[idx] = sum(cs) / len(cs); allc.append(c)
        _cache[p] = (lines, sum(allc) / len(allc) if allc else 0.0, lconf)
    return _cache[p]

def is_caps(line):
    letters = [c for c in line if c.isalpha()]
    return len(letters) >= 3 and sum(c.isupper() for c in letters) / len(letters) >= 0.85

def find_heading(n, p):
    """-> (line index, number of heading lines) on page p, or None."""
    lines, _, _ = page(p)
    want = norm(n["name"])
    if not want: return None
    best = None
    for i, l in enumerate(lines):
        for span in (1, 2):
            chunk = " ".join(x.strip() for x in lines[i:i + span])
            if not chunk.strip() or not is_caps(chunk): continue
            score = difflib.SequenceMatcher(None, norm(chunk), want).ratio()
            ref = re.search(r"\((\d+[^)]*)\)", chunk)
            if n.get("semirRef") and ref and re.sub(r"\s", "", ref.group(1)) == n["semirRef"]: score += 0.25
            if score >= 0.72 and (best is None or score > best[0]): best = (score, i, span)
    return best[1:] if best else None

def paragraphs(items):
    """items: [(line, confidence)] -> (text, number of low-confidence paragraphs dropped). Drops page numbers, joins hyphenated
    line ends and drops paragraphs whose words were read with low confidence (map/drawing labels read as garbage)."""
    pars, cur = [], []
    for l, c in items:
        s = l.strip()
        if not s:
            if cur: pars.append(cur); cur = []
        elif not re.fullmatch(r"\d{1,3}", s) and not re.fullmatch(r"(SECCI[ÓO]\s+[IVX]+.*|[\W_]{1,6}|[Il1 ]{1,6})", s):
            cur.append((s, c))
    if cur: pars.append(cur)
    texts, dropped = [], 0
    for par in pars:
        words = sum(len(s.split()) for s, _ in par)
        conf = sum(c * len(s.split()) for s, c in par) / max(words, 1)
        if words >= 4 and conf < 60: dropped += 1; continue
        t = ""
        for s, _ in par:
            if t.endswith("-") and s[:1].islower(): t = t[:-1] + s   # "ca-" + "nal" -> "canal"
            else: t = (t + " " + s).strip()
        texts.append(t)
    return "\n\n".join(texts), dropped

def confident_words(p):
    n = 0
    for r in csv.reader(open(os.path.join(PAGES, f"p{p:03d}.tsv"), encoding="utf-8"), delimiter="\t", quoting=csv.QUOTE_NONE):
        if len(r) >= 12 and r[0] == "5" and float(r[10] or 0) > 70 and len(r[11].strip()) > 2: n += 1
    return n

# Book order inside a page: needles that share a page are ordered by where their heading is on the page (so reviewer-added needles
# land in the right place); needles whose heading is not found inherit the position of the previous one.
_pos, _last = {}, (0, -1)
for n in needles:
    pg = n["bookReferences"][0]["page"]; h0 = find_heading(n, pg)
    _last = (pg, h0[0]) if h0 else (pg, _last[1] if _last[0] == pg else -1)
    _pos[n["id"]] = _last
_order = {s["id"]: i for i, s in enumerate(json.load(open(os.path.join(ROOT, "data", "sections.json"), encoding="utf-8")))}
needles = [n for _, n in sorted(enumerate(needles), key=lambda t: (_order[t[1]["sectionId"]], _pos[t[1]["id"]][0], _pos[t[1]["id"]][1] + (0.5 if _pos[t[1]["id"]][1] >= 0 and not find_heading(t[1], t[1]["bookReferences"][0]["page"]) else 0), t[0]))]
_ord = {}
for n in needles: _ord.setdefault(n["sectionId"], []).append(n["id"])
json.dump(_ord, open(os.path.join(ROOT, "data", "ocr", "needle-order.json"), "w"), indent=1)

result, rows = {}, []
for i, n in enumerate(needles):
    pages = [b["page"] for b in n["bookReferences"]]
    start_p = pages[0]
    # the entry runs up to the next needle's heading (the data only lists up to 3 pages, but long routes run further)
    if i + 1 < len(needles) and 0 <= needles[i + 1]["bookReferences"][0]["page"] - start_p <= 8:
        pages = list(range(start_p, needles[i + 1]["bookReferences"][0]["page"] + 1))
    h = find_heading(n, start_p)
    nxt = needles[i + 1] if i + 1 < len(needles) else None
    nh, nxt_p = None, None
    if nxt:
        nxt_p = nxt["bookReferences"][0]["page"]
        if nxt_p in pages: nh = find_heading(nxt, nxt_p)
    if not h:
        rows.append([n["id"], n["name"], start_p, "heading-not-found", ""]); continue
    # collect lines from the heading to the end boundary
    chunk, sec_stop = [], False
    for p in pages:
        if p != start_p and confident_words(p) <= 45: continue          # map/drawing page in between: not running text
        lines, _, lconf = page(p)
        lo = h[0] + h[1] if p == start_p else 0
        hi = len(lines)
        if nh and p == nxt_p: hi = nh[0] if p != start_p or nh[0] >= lo else len(lines)
        if p == start_p and nh and nxt_p == start_p and nh[0] < lo: nh = None; hi = len(lines)
        # a section/region heading ("Secció sisena - Frares", "REGIÓ D'AGULLES") ends the needle: what follows is section/region intro text
        stop = next((k for k in range(lo, hi) if re.match(r"(Secci[óo]\s+[\w-]+\s*[-—–]\s*\S|REGI[ÓO]\s+(D|DE|DELS|DEL)\b)", lines[k].strip())), None)
        if stop is not None: hi = stop
        chunk += list(zip(lines[lo:hi], lconf[lo:hi]))
        if stop is not None: sec_stop = True; break
        if nh and p == nxt_p: break
    conf = sum(page(p)[1] for p in pages) / len(pages)
    text, dropped = paragraphs(chunk)
    flags = []
    if dropped: flags.append(f"dropped-{dropped}-noisy-paragraphs")
    if not nh and nxt and not sec_stop: flags.append("end-uncertain")
    if conf < 60: flags.append("low-confidence")
    if len(text) < 40: flags.append("very-short")
    result[n["id"]] = {"text": text, "pages": pages, "headingFound": True, "endFound": bool(nh) or not nxt or sec_stop,
                       "meanConf": round(conf, 1), "droppedNoise": dropped, "status": "ocr-unreviewed"}
    rows.append([n["id"], n["name"], start_p, ",".join(flags) or "ok", round(conf, 1)])

json.dump(result, open(os.path.join(ROOT, "data", "ocr", "descriptions.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
csv.writer(open(os.path.join(ROOT, "data", "ocr", "report.csv"), "w", newline="", encoding="utf-8")).writerows([["needle_id", "name", "page", "status", "mean_conf"]] + rows)
from collections import Counter
print(len(result), "of", len(needles), "needles have OCR text;", dict(Counter(r[3].split(",")[0] if not r[3].startswith("dropped") else "dropped-noise" for r in rows)))
