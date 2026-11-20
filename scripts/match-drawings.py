#!/usr/bin/env python3
"""Find the drawing plates (pages with a title like "LA PORTELLA -17-" and almost no running text) and attach them to needles.
Input: data/ocr/pages/*.tsv|txt, data/needles.json. Output: data/drawings.json {needleId: [pages]} and data/ocr/drawings-report.csv.
Only page numbers and match reasons are stored (the images themselves are git-ignored, see docs/book-pages.md)."""
import csv, glob, json, os, re, unicodedata
from difflib import SequenceMatcher
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = os.path.join(ROOT, "data/ocr/pages")
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from needles_lib import load_needles
needles = load_needles()

def norm(s):
    s = unicodedata.normalize("NFKD", s.lower()); s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]", " ", re.sub(r"[’']", "", s)).split()
def key(s): return " ".join(w for w in norm(s) if w not in ("l", "la", "el", "les", "els", "de", "del", "dels", "d", "o"))

def confident_words(p):
    n = 0
    for r in csv.reader(open(os.path.join(PAGES, f"p{p:03d}.tsv"), encoding="utf-8"), delimiter="\t", quoting=csv.QUOTE_NONE):
        if len(r) >= 12 and r[0] == "5" and r[11].strip():
            try:
                if float(r[10]) > 70 and len(r[11].strip()) > 2: n += 1
            except ValueError: pass
    return n

def captions(p):
    """-> [(name text, number|None)] from the first lines of the page's text"""
    lines = [l.strip() for l in open(os.path.join(PAGES, f"p{p:03d}.txt"), encoding="utf-8").read().split("\n")[:8]]
    out, pending = [], []
    for l in lines:
        if not l: 
            if pending: out.append(pending); pending = []
            continue
        if re.search(r"[a-zà-ú]{4,}", l) and not l.isupper() and not re.search(r"[A-Z]{3}", l): 
            if pending: out.append(pending)
            pending = []; continue                       # lowercase text = subtitle ("Via Normal") or garbage
        pending.append(l)
    if pending: out.append(pending)
    res = []
    for blk in out:
        cur = ""
        for l in blk:
            m = re.fullmatch(r"[-—– ]*[MmIl]?\s*(\d{1,3})\s*[-—– ]*", l)
            if m and cur: res.append((cur, int(m.group(1)))); cur = ""; continue
            m = re.search(r"^(.*?[A-ZÀ-Ú].*?)\s*[-—–]\s*[MmIl]?\s*(\d{1,3})\s*[-—–]\s*(?:\W.{0,6})?$", l)
            if m:
                if cur: res.append((cur, None))
                res.append((m.group(1), int(m.group(2)))); cur = ""
            else:
                if cur: res.append((cur, None))
                cur = l
        if cur: res.append((cur, None))
    return res

CROPS = json.load(open(os.path.join(ROOT, "data/source/drawings-crops.json"))) if os.path.exists(os.path.join(ROOT, "data/source/drawings-crops.json")) else {}
result, rows = {}, []
for f in sorted(glob.glob(os.path.join(PAGES, "p*.txt"))):
    p = int(f[-7:-4])
    if p < 5 or (confident_words(p) > 45 and str(p) not in CROPS): continue
    if re.search(r"SECCI[ÓO0]\s+[IVXL]+", open(f, encoding="utf-8").read()): continue   # section map (compass + needle labels), not a drawing
    caps = captions(p)
    if str(p) in CROPS:                                                                  # mixed page: captions read next to the drawing (detect-mixed-plates.py); the page's first lines are body text
        caps = []
        for c in CROPS[str(p)].get("captions", []):
            m = re.search(r"[-—–]\s*(\d{1,3})", c); caps.append((re.sub(r"[-—–]\s*\d.*$", "", c), int(m.group(1)) if m else None))
    for text, num in caps:
        text = re.sub(r"^[^A-ZÀ-Ú]*", "", text)
        k = key(text)
        if len(k) < 3: continue
        best = None
        for n in needles:
            names = [n["name"]] + n.get("alternativeNames", [])
            sim = max(SequenceMatcher(None, k, key(x)).ratio() for x in names)
            ref = n.get("semirRef"); refok = num is not None and ref and str(num) == str(ref).strip()
            dist = abs(n["bookReferences"][0]["page"] - p)
            score = sim + (0.3 if refok else 0) - (0.4 if dist > 15 else 0)
            if dist <= 15 and (sim >= 0.85 or (refok and sim >= 0.55)) and (best is None or score > best[0]): best = (score, n, sim, refok, dist)
        if best:
            _, n, sim, refok, dist = best
            result.setdefault(n["id"], [])
            if p not in result[n["id"]]: result[n["id"]].append(p)
            rows.append([p, text, num, n["id"], n["name"], round(sim, 2), refok, dist])
        else: rows.append([p, text, num, "", "", "", "", ""])
# manual corrections (data/source/drawings-manual.csv): action add|remove, with the reason recorded
for r in csv.DictReader(open(os.path.join(ROOT, "data/source/drawings-manual.csv"), encoding="utf-8")):
    pg, nid = int(r["page"]), r["needle_id"]
    if r["action"] == "add": result.setdefault(nid, []); pg in result[nid] or result[nid].append(pg)
    elif r["action"] == "remove" and pg in result.get(nid, []): result[nid].remove(pg)
result = {k: v for k, v in result.items() if v}
for v in result.values(): v.sort()
json.dump(dict(sorted(result.items())), open(os.path.join(ROOT, "data/drawings.json"), "w"), indent=1)
with open(os.path.join(ROOT, "data/ocr/drawings-report.csv"), "w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh); w.writerow(["page", "caption", "number", "needle", "needle_name", "sim", "semir_match", "page_distance"]); w.writerows(rows)
print(f"{len(result)} needles with drawings; {sum(len(v) for v in result.values())} plates; {sum(1 for r in rows if not r[3])} captions unmatched")
