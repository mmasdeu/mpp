#!/usr/bin/env python3
"""Split the OCR of «Biografies d'escaladors montserratins» (book pp. 392-397) into one entry per climber.
Input : data/ocr/pages/p392..p397.tsv|txt
Output: data/ocr/biographies.json   [{id, name, surname, given, pages, text, meanConf, status}]  (git-ignored: copyrighted OCR text)
        data/review/biographies.json [{id, name, pages}]  the list the site is built from (names and pages only; written only if absent,
                                     so reviewers' corrections to names survive a new run)
An entry starts with the climber's name in capitals ("ALAIX I FORRELLAT, Josep."); an entry cut by a page break continues on the next page.
Usage: python3 scripts/segment-biographies.py"""
import csv, json, os, re, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = list(range(392, 398))
HEAD = re.compile(r"^((?:\(?[A-ZÀ-ÚÇ][A-ZÀ-ÚÇ'’·\-]+\)?)(?:\s+(?:I|Il|l|1)\s+\(?[A-ZÀ-ÚÇ'’·\-]+\)?|\s+\(?[A-ZÀ-ÚÇ'’·\-]{2,}\)?)*),\s+((?:[A-ZÀ-Úa-zà-úç·'’]+\.? ?){1,6}?)(?:[.,]\s|\.$)")
SMALL = {"i", "de", "del", "d'", "la", "el"}
def paragraphs(p):
    t = open(os.path.join(ROOT, f"data/ocr/pages/p{p:03d}.txt"), encoding="utf-8").read()
    out = []
    for blk in re.split(r"\n\s*\n", t):
        lines = [l.strip() for l in blk.split("\n") if l.strip()]
        if not lines or re.fullmatch(r"\d{3}", " ".join(lines)) or lines[0].startswith("BIOGRAFIES D"): continue
        out.append(lines)
    return out
def join(lines):
    s = ""
    for l in lines:
        if s.endswith("-") and re.match(r"[a-zà-ú]", l): s = s[:-1] + l            # line-end hyphenation: "cor-" + "dada"
        else: s = (s + " " + l) if s else l
    return re.sub(r"\s+", " ", s).strip()
def conf(p):
    cs = [float(r[10]) for r in csv.reader(open(os.path.join(ROOT, f"data/ocr/pages/p{p:03d}.tsv"), encoding="utf-8"), delimiter="\t", quoting=csv.QUOTE_NONE)
          if len(r) >= 12 and r[0] == "5" and r[11].strip() and r[10] not in ("-1", "conf")]
    return sum(cs) / len(cs) if cs else 0
def slug(s):
    s = unicodedata.normalize("NFKD", s.lower()); s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")
def title(s):
    t = " ".join(w.lower() if w.lower() in ("i", "de", "del") else (w[0] + w[1:].lower() if "'" not in w else w.split("'")[0].lower() + "'" + w.split("'", 1)[1].capitalize()) for w in s.split())
    return re.sub(r"\((\w)", lambda m: "(" + m.group(1).upper(), t)
entries, last_open = [], None
for p in PAGES:
    first = True
    for lines in paragraphs(p):
        text = join(lines); m = HEAD.match(text)
        if m:
            surname = re.sub(r"\s+(Il|l|1)\s+", " I ", m.group(1)); given = re.sub(r"\b([A-Z])$", r"\1.", m.group(2).strip().rstrip("."))
            entries.append({"surname": title(surname), "given": given, "pages": [p], "paras": [text[m.end():].strip()], "heading": text[:m.end()]})
        elif entries:                                                           # continuation: (end of) the previous entry, possibly across the page break
            e = entries[-1]
            if p not in e["pages"]: e["pages"].append(p)
            if first and not re.search(r"[.:]$", e["paras"][-1]) and e["pages"][-2:] != [p]: e["paras"][-1] += " " + text
            elif first and e["paras"][-1].endswith("-") : e["paras"][-1] = e["paras"][-1][:-1] + text
            else: e["paras"].append(text)
        first = False
out, ids = [], set()
for e in entries:
    name = f"{e['surname']}, {e['given']}"; i = slug(name); k = 2
    while i in ids: i = f"{slug(name)}-{k}"; k += 1
    ids.add(i)
    pages = sorted(set(e["pages"]))
    out.append({"id": i, "name": name, "surname": e["surname"], "given": e["given"], "pages": pages, "text": "\n\n".join(e["paras"]), "meanConf": round(sum(conf(p) for p in pages) / len(pages), 1), "status": "ocr-unreviewed"})
os.makedirs(os.path.join(ROOT, "data/ocr"), exist_ok=True); os.makedirs(os.path.join(ROOT, "data/review"), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, "data/ocr/biographies.json"), "w"), ensure_ascii=False, indent=1)
idx = os.path.join(ROOT, "data/review/biographies.json")
if not os.path.exists(idx): json.dump([{"id": o["id"], "name": o["name"], "pages": o["pages"]} for o in out], open(idx, "w"), ensure_ascii=False, indent=1)
print(len(out), "climbers"); [print(" ", o["id"], "|", o["name"], o["pages"], len(o["text"])) for o in out]
