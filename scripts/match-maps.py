#!/usr/bin/env python3
"""Assign the section map pages (compass + needle labels, caption "SECCIÓ VI") to sections.
Automatic: roman numeral in the OCR caption + the map page must be within 2 pages of the section's first page.
Manual overrides/additions: data/source/maps-manual.csv (page,target,action add|remove,reason; target = sectionId or regionId).
Output: data/maps.json {"sections": {sId: [pages]}, "regions": {rId: [pages]}}"""
import csv, glob, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: json.load(open(os.path.join(ROOT, p), encoding="utf-8"))
secs = rd("data/sections.json"); start = {s["id"]: s["bookReference"]["pageStart"] for s in secs}
def rom(s):
    v = {"I": 1, "V": 5, "X": 10, "L": 50}; t = 0
    for i, c in enumerate(s): t += -v[c] if i + 1 < len(s) and v[c] < v[s[i + 1]] else v[c]
    return t
order = {s["order"]: s["id"] for s in secs}
out = {"sections": {}, "regions": {}}
for f in sorted(glob.glob(os.path.join(ROOT, "data/ocr/pages/p*.txt"))):
    p = int(f[-7:-4]); t = open(f, encoding="utf-8").read()
    m = re.search(r"SECCI[ÓO0]\s+([IVXL]+)", t)
    if not m: continue
    conf = sum(1 for r in csv.reader(open(f[:-4] + ".tsv", encoding="utf-8"), delimiter="\t", quoting=csv.QUOTE_NONE)
               if len(r) >= 12 and r[0] == "5" and float(r[10] or 0) > 70 and len(r[11].strip()) > 2)
    if conf > 45: continue                                              # running text page with a "SECCIÓ" footer, not a map
    sid = order.get(rom(m.group(1)))
    if sid and abs(p - start[sid]) <= 2: out["sections"].setdefault(sid, []).append(p)
for r in csv.DictReader(open(os.path.join(ROOT, "data/source/maps-manual.csv"), encoding="utf-8")):
    kind = "sections" if r["target"].startswith("s") else "regions"; pg = int(r["page"]); lst = out[kind].setdefault(r["target"], [])
    if r["action"] == "add" and pg not in lst: lst.append(pg)
    if r["action"] == "remove" and pg in lst: lst.remove(pg)
for k in out: out[k] = {a: sorted(b) for a, b in sorted(out[k].items()) if b}
json.dump(out, open(os.path.join(ROOT, "data/maps.json"), "w"), indent=1)
print(len(out["sections"]), "of", len(secs), "sections with a map;", "missing:", [s for s in start if s not in out["sections"]])
