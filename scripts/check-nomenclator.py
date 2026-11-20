#!/usr/bin/env python3
"""Checks the book's index («Nomenclàtor», pp. 398–405) against the needles: every index entry (name + page) should be a needle on that page.
1. OCR of the two columns of each page separately (400 dpi render from the PDF, binarised, tesseract cat --psm 6): the page OCR mixes the columns.
2. Entries = lines up to the page number(s); «(o X)» = alternative names.
3. Match with the needles that cite that page (name, alternative names, merged entries), with OCR-tolerant words. When nothing on the page
   fits, look-alike digits (1/7, 3/8, 5/6) are tried, then the whole book.
Output: data/ocr/nomenclator.json (entries) and data/ocr/nomenclator-informe.csv (one row per entry: igual / nom diferent / en una altra
pàgina / no trobada). Git-ignored (book text).
Usage: python3 scripts/check-nomenclator.py "Montserrat Pam a Pam.pdf"   (needs pdftoppm, tesseract-ocr-cat, npx tsx)"""
import csv, difflib, glob, json, os, re, subprocess, sys, tempfile, unicodedata
from collections import Counter
import numpy as np
from PIL import Image, ImageOps
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = sys.argv[1]
tmp = tempfile.mkdtemp()
cols = {}
for p in range(398, 406):
    subprocess.check_call(["pdftoppm", "-r", "400", "-gray", "-png", "-f", str(p), "-l", str(p), PDF, os.path.join(tmp, f"p{p}")])
    im = Image.open(glob.glob(os.path.join(tmp, f"p{p}*.png"))[0]).convert("L"); a = np.array(im) < 140
    h, w = a.shape; col = a[int(h * .08):int(h * .92)].sum(0)
    best, cur = (0, 0), None
    for x in range(int(w * .4), int(w * .6)):                 # the gutter: widest empty band near the middle
        if col[x] <= 2:
            cur = x if cur is None else cur
            if x - cur > best[1] - best[0]: best = (cur, x)
        else: cur = None
    split = (best[0] + best[1]) // 2
    cols[str(p)] = []
    for i, (x0, x1) in enumerate([(0, split), (split, w)]):
        out = os.path.join(tmp, f"c{p}-{i}")
        ImageOps.expand(im.crop((x0, 0, x1, h)).point(lambda v: 255 if v > 150 else 0), 40, 255).save(out + ".png")
        subprocess.check_call(["tesseract", out + ".png", out, "-l", "cat", "--psm", "6", "--dpi", "400"], stderr=subprocess.DEVNULL)
        cols[str(p)].append([l for l in open(out + ".txt", encoding="utf-8").read().split("\n") if l.strip()])
entries = []
for p in sorted(cols, key=int):
    for side, lines in enumerate(cols[p]):
        buf = []
        for l in lines:
            l = l.strip()
            if not l or l.upper().startswith('NOMENCL') or re.fullmatch(r'[A-ZÀ-Ú]\.?', l) or re.fullmatch(r'\d{3}', l): continue
            buf.append(l)
            m = re.search(r'[,.]?\s*((?:\d{1,4}\s*[,y-]\s*)*\d{1,4})\s*[.,;:]?\s*(\S{0,2})$', l)
            if m and (len(m.group(2)) <= 1):
                text = ' '.join(buf); buf = []
                text = re.sub(r'\s*\S{0,1}$', '', text) if re.search(r'\d[.,]\s+\S$', text) else text
                mm = re.search(r'^(.*?)[,.]?\s*((?:\d{1,4}\s*[,y-]\s*)*\d{1,4})\s*[.,;:]?\s*\S{0,2}$', text)
                name, nums = mm.group(1).strip(' ,.'), [int(x) for x in re.findall(r'\d{1,4}', mm.group(2))]
                entries.append({'page': int(p), 'col': side, 'raw': text, 'name': name, 'pages': nums})
        if buf: entries.append({'page': int(p), 'col': side, 'raw': ' '.join(buf), 'name': ' '.join(buf), 'pages': [], 'unparsed': True})
json.dump(entries, open(os.path.join(ROOT, 'data/ocr/nomenclator.json'), 'w'), ensure_ascii=False, indent=1)

E = entries
N = json.loads(subprocess.check_output(["npx", "tsx", "scripts/dump-needles.ts"], cwd=ROOT))
def norm(s):
    s = unicodedata.normalize('NFKD', s.lower()); s = ''.join(c for c in s if not unicodedata.combining(c))
    w = re.findall(r"[a-z0-9]+", s.replace('·', ''))
    return [{'deis': 'dels', '1': 'i', 'ags': 'ag'}.get(x, x) for x in w]
STOP = {'el','la','els','les','l','lo','de','del','dels','d','den','en','o','i','a','sa','es','dalt','baix'} - {'dalt','baix'}
TYPE = {'ag','ags','agulla','agulles','agulleta','roca','roques','rova','serrat','cova','avenc','turo','roc','cota','cotes','penya'}
def core(s): return [w for w in norm(s) if w not in STOP and w not in TYPE]
def tokmatch(a, b): return a == b or (len(a) > 3 and len(b) > 3 and difflib.SequenceMatcher(None, a, b).ratio() >= 0.8)
def score(ec, nc):
    if not ec or not nc: return 0
    hit = sum(1 for w in ec if any(tokmatch(w, v) for v in nc))
    back = sum(1 for v in nc if any(tokmatch(w, v) for w in ec))
    return min(hit / len(ec), back / len(nc)) if hit else 0, hit / len(ec)
def variants(n):
    out = []
    for nm in [n['name']] + n['alt'] + n['merged']:
        out.append(nm); out += [x for x in re.split(r'\s+[Oo]\s+|,\s*', nm) if x.strip()]
    return out
by_page = {}
for n in N:
    for p in set(n['pages']): by_page.setdefault(p, []).append(n)
rows = []
for e in E:
    names = [e['name']] + re.findall(r'\(o ([^)]*)\)', e['name'])
    base = re.sub(r'\(o [^)]*\)', '', e['name'])
    ecs = [core(base)] + [core(x) for x in names[1:]]
    best = None
    for p in e['pages'] or []:
        for n in by_page.get(p, []):
            nnames = variants(n)
            for ec in ecs:
                for nn in nnames:
                    s = score(ec, core(nn))
                    if s and (best is None or s > best[0]): best = (s, n, nn, p)
    # OCR digit slips in the page number (7 read as 1, 8 as 3…): try the look-alike pages when the printed one does not fit
    fixed = None
    if not best or best[0][1] < 0.5:
        CONF = {'1': '7', '7': '1', '3': '8', '8': '3', '5': '6', '6': '5', '4': '1'}
        for p0 in e['pages'] or []:
            s0 = str(p0)
            for i, ch in enumerate(s0):
                if ch not in CONF: continue
                p = int(s0[:i] + CONF[ch] + s0[i + 1:])
                for n in by_page.get(p, []):
                    for ec in ecs:
                        for nn in variants(n):
                            sc = score(ec, core(nn))
                            if sc and sc[1] >= 0.5 and (best is None or sc > best[0]): best = (sc, n, nn, p); fixed = p
            if len(s0) == 2:                             # a lost digit: «16» for «176»
                pass
    # global fallback (another page)
    gbest = None
    if not best or best[0][1] < 0.5:
        for n in N:
            for nn in variants(n):
                for ec in ecs:
                    s = score(ec, core(nn))
                    if s and (gbest is None or s > gbest[0]): gbest = (s, n, nn)
    if best and best[0][0] >= 0.99: st = 'igual'
    elif best and best[0][1] >= 0.5: st = 'nom diferent'
    elif gbest and gbest[0][0] >= 0.99: st = 'en una altra pàgina'
    else: st = 'no trobada'
    rows.append({'pag_nomenclator': e['page'], 'entrada': e['raw'], 'pagines': e['pages'], 'estat': st, 'pagina_corregida': fixed or '',
                 **({'agulla': hit[1]['id'], 'nom_agulla': hit[1]['name'], 'pagines_agulla': hit[1]['pages']} if (hit := (gbest if st == 'en una altra pàgina' else best or gbest)) else {'agulla': '', 'nom_agulla': '', 'pagines_agulla': []})})
from collections import Counter
ORDER = {'no trobada': 0, 'en una altra pàgina': 1, 'nom diferent': 2, 'igual': 3}
rows.sort(key=lambda r: (ORDER[r['estat']], r['pag_nomenclator']))
with open(os.path.join(ROOT, 'data/ocr/nomenclator-informe.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['estat', 'pagina_nomenclator', 'entrada_nomenclator', 'pagines_citades', 'pagina_corregida_ocr', 'agulla', 'nom_agulla', 'pagines_agulla'])
    for r in rows: w.writerow([r['estat'], r['pag_nomenclator'], r['entrada'], ' '.join(map(str, r['pagines'])), r['pagina_corregida'], r['agulla'], r['nom_agulla'], ' '.join(map(str, r['pagines_agulla']))])
print(len(rows), 'entrades:', dict(Counter(r['estat'] for r in rows)))
