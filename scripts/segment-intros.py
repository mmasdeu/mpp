#!/usr/bin/env python3
"""Extract the introductory text of each section and region (text that belongs to no needle) from the OCR pages.
Section intro: text on the section's first page after its heading ("Secció sisena - Frares") up to the first needle's page.
Region intro: text from the region's first page to the page before its first section. Paragraphs already contained in a needle's
text are skipped; low-confidence paragraphs (map labels) dropped. Output (git-ignored, copyrighted): data/ocr/intros.json."""
import csv, json, os, re, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PAGES = os.path.join(ROOT, "data/ocr/pages")
rd = lambda p: json.load(open(os.path.join(ROOT, p), encoding="utf-8"))
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from needles_lib import load_needles, load_sections
needles = {n["id"]: n for n in load_needles()}; secs = load_sections(); regs = rd("data/regions.json"); desc = rd("data/ocr/descriptions.json")
REGION_START = {"r01": 8, "r02": 81, "r03": 131, "r04": 189, "r05": 255, "r06": 335}   # heading pages ("REGIÓ D'AGULLES"...), checked on the scans
def norm(s):
    s = unicodedata.normalize("NFKD", s.lower()); return re.findall(r"[a-z]{2,}", "".join(c for c in s if not unicodedata.combining(c)))
cover = {}
for nid, d in desc.items():
    ts = set(norm(d["text"])) | set(norm(needles[nid]["name"]))
    for p in d["pages"]: cover.setdefault(p, []).append(ts)
def lines(p):
    rows = {}
    for r in csv.reader(open(os.path.join(PAGES, f"p{p:03d}.tsv"), encoding="utf-8"), delimiter="\t", quoting=csv.QUOTE_NONE):
        if len(r) >= 12 and r[0] == "5" and r[11].strip():
            try: rows.setdefault((int(r[2]), int(r[3]), int(r[4])), []).append((float(r[10]), r[11].strip()))
            except ValueError: pass
    return rows
def confident(p): return sum(1 for ws in lines(p).values() for c, w in ws if c > 70 and len(w) > 2)
def paragraphs(p):
    """-> [(text, conf)] by Tesseract paragraph, hyphenated line ends joined"""
    pars = {}
    for (b, pa, ln), ws in sorted(lines(p).items()): pars.setdefault((b, pa), []).append(ws)
    out = []
    for k in sorted(pars):
        t, cs = "", []
        for ws in pars[k]:
            s = " ".join(w for _, w in ws); cs += [c for c, _ in ws]
            t = (t[:-1] + s) if t.endswith("-") and s[:1].islower() else (t + " " + s).strip()
        if re.fullmatch(r"\d{1,3}", t): continue
        out.append((t, sum(cs) / len(cs)))
    return out
def collect(pages, skip_until_heading=None):
    texts, confs, used = [], [], []
    for p in pages:
        if confident(p) <= 45: continue                                      # map / drawing page
        ps = paragraphs(p); seen_heading = skip_until_heading is None or p != pages[0]
        for t, c in ps:
            if not seen_heading:
                if re.match(r"Secci[óo]\s", t): seen_heading = True
                continue
            toks = norm(t)
            if not toks or c < 60 or re.match(r"(Secci[óo]\s|REGI[ÓO]\s)", t) or (t.isupper() and len(toks) <= 6): continue
            if any(sum(w in ts for w in toks) / len(toks) >= 0.8 for ts in cover.get(p, [])): continue
            texts.append(t); confs.append(c); 
            if p not in used: used.append(p)
    return {"text": "\n\n".join(texts), "pages": used, "meanConf": round(sum(confs) / len(confs), 1) if confs else 0, "status": "ocr-unreviewed"} if texts else None
out = {"sections": {}, "regions": {}}
for s in secs:
    first = min(needles[i]["bookReferences"][0]["page"] for i in s["needleIds"]); a = s["bookReference"]["pageStart"]
    r = collect(list(range(a, max(first, a) + 1)), skip_until_heading=True)
    if r: out["sections"][s["id"]] = r
for rg in regs:
    a = REGION_START[rg["id"]]; b = min(x["bookReference"]["pageStart"] for x in secs if x["bookReference"]["pageStart"] > a)   # up to the next section start
    r = collect(list(range(a, b)))
    if r: out["regions"][rg["id"]] = r
json.dump(out, open(os.path.join(ROOT, "data/ocr/intros.json"), "w"), ensure_ascii=False, indent=1)
print({k: len(v) for k, v in out.items()}, "missing sections:", [s["id"] for s in secs if s["id"] not in out["sections"]])
