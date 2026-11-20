#!/usr/bin/env python3
"""Text of the book's front matter shown on the home page (data/front.json, entries without "kind": "map"), from the page OCR.
Output: data/ocr/front.json {id: {text, pages, status}} (git-ignored: copyrighted). Paragraphs are kept; line-end hyphenation is joined;
the title line, folios and the «x x x» separator (→ «* * *») are handled. Usage: python3 scripts/segment-front.py"""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
front = json.load(open(os.path.join(ROOT, "data/front.json"), encoding="utf-8"))
out = {}
for f in front:
    if f.get("kind"): continue                                              # maps, index
    blocks = []
    for p in f["pages"]:
        t = open(os.path.join(ROOT, f"data/ocr/pages/p{p:03d}.txt"), encoding="utf-8").read()
        for b in re.split(r"\n\s*\n", t):
            lines = [l.strip() for l in b.split("\n") if l.strip()]
            if not lines: continue
            if re.fullmatch(r"\d{1,3}", " ".join(lines)): continue                       # folio
            if len(lines) == 1 and lines[0].upper() == f["title"].upper(): continue        # the title itself
            if re.fullmatch(r"[xX×\s]+\w{0,3}", " ".join(lines)): blocks.append("* * *"); continue
            s = ""
            for l in lines:
                s = s[:-1] + l if s.endswith("-") and re.match(r"[a-zà-ú]", l) else (s + " " + l if s else l)
            blocks.append(s)
    # a paragraph cut by the page break: joined when it does not end a sentence
    merged = []
    for b in blocks:
        if merged and merged[-1] != "* * *" and b != "* * *" and not re.search(r"[.:!?»)]$", merged[-1]) and re.match(r"[a-zà-ú(]", b): merged[-1] += " " + b
        else: merged.append(b)
    if f.get("author") and merged and merged[-1].replace(" ", "").upper() == f["author"].replace(" ", "").upper(): merged.pop()   # signature
    out[f["id"]] = {"text": "\n\n".join(merged), "pages": f["pages"], "status": "ocr-unreviewed"}
os.makedirs(os.path.join(ROOT, "data/ocr"), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, "data/ocr/front.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for k, v in out.items(): print(k, v["pages"], len(v["text"]), "chars,", v["text"].count("\n\n") + 1, "paragraphs")
