#!/usr/bin/env python3
"""Candidate needle extraction from the pdftotext output of the book.

Usage: extract_region.py FULL_TXT OUT_JSON START_LINE END_LINE
Heuristic only: output is *unreviewed* candidate headings, never canonical data.
Entry heading = ALL-CAPS line ending in a Semir plan number, e.g. "AGULLA PELADA (19-20)".
"""
import json, re, sys

txt_path, out_path, start, end = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
raw = open(txt_path, encoding="utf-8").read()
pages, line_page, ln = raw.split("\f"), {}, 1
for pno, p in enumerate(pages, 1):
    for _ in p.split("\n")[:-1] if pno < len(pages) else p.split("\n"):
        line_page[ln] = pno
        ln += 1
lines = raw.replace("\f", "\n").split("\n")  # NB: \f adds a line; recompute map below
lines, line_page, ln = [], {}, 1
for pno, p in enumerate(pages, 1):
    for l in p.split("\n"):
        lines.append(l); line_page[ln] = pno; ln += 1

PAT = re.compile(r"^\s{0,30}((?:[A-ZÀ-Ú«»'’·,.\- ]|\bDE[LS]?\b|\d{1,2}\b)+?)\s*[(\-–]\s*([0-9A-B][0-9A-B ,\-–aA]*?)\s*[)\-–]?\s*$")
out = []
for i in range(start, end + 1):
    l = lines[i - 1]
    if re.search(r"[a-zà-ú]", l):
        continue
    m = PAT.match(l.rstrip())
    if not m:
        # "plain" heading: later regions cite no Semir number. Own line, blank before, prose after.
        t = re.sub(r"\s+", " ", l.strip())
        nxt = next((x for x in lines[i:i + 4] if x.strip()), "")
        if (re.fullmatch(r"[A-ZÀ-Ú«»'’·,.\- ]{6,60}", t) and not lines[i - 2].strip() and re.search(r"[a-zà-ú]{3}", nxt)
                and not re.match(r"(COTA|SECCI|REGI|NOMENCL|MONTSERRAT|PLANOL|PLÀNOL)", t) and len(l) - len(l.lstrip()) < 30):
            out.append({"line": i, "pdfPage": line_page[i], "rawHeading": l.strip(), "name": t,
                        "semirRef": None, "confidence": "plain"})
        continue
    if len(m.group(1).strip()) >= 4:
        out.append({"line": i, "pdfPage": line_page[i], "rawHeading": l.strip(),
                    "name": re.sub(r"\s+", " ", m.group(1)).strip(" -–"),
                    "semirRef": m.group(2).strip(),
                    "confidence": "paren" if "(" in l else "dash"})
json.dump({"source": "Montserrat Pam a Pam.pdf (pdftotext -layout)", "range": [start, end],
           "status": "unreviewed", "candidates": out}, open(out_path, "w"), ensure_ascii=False, indent=1)
print(len(out), "candidates")
