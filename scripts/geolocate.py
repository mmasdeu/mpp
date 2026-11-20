"""Propose coordinates for needles that still have none, from two open gazetteers, using the book's structure as a check.

Sources (data/source/geolocation/):
  icgc-geocoder-*.json     ICGC toponymy 1:5.000 (CC BY 4.0), fetched with the ICGC geocoder for every unlocated needle name
  montserrat-osm.geojson   OpenStreetMap natural=* named nodes (ODbL), incl. CodiSemir tags and "Roca NNN" names

Matching (names are OCR'd from a 1977 book, so it is deliberately conservative):
  1. Name keys: lowercase, no accents, no articles, common OCR slips fixed ("Deis" -> "dels"), and a *core* key without the
     generic head word (Roca de la Gorra Frígia ~ la Gorra Frígia). A toponym whose head is a different kind of feature
     (Coll, Canal, Cova, Font, Pas…) is only "near" the needle, never the needle itself.
  2. Semir numbers: OSM CodiSemir, or OSM names like "Roca 407", "(Roca 417)", "Cota 288", against the book's numbers.
  3. Spatial check: the book describes each section as a walk, so a needle should lie near the needles of its section that
     are already located. A candidate is accepted only if it is within MAX_SECTION_DIST of them (or of the region, when the
     section has no located needle yet). When a name has several places, the one that fits the section wins only if it is
     clearly the closest.
  4. One place -> one needle. Ties and doubtful cases go to a review CSV, never into the data.

Output: data/source/geolocation/geolocate-proposals.json (accepted, with evidence) and geolocate-review.csv (for a human).
Also lists already-located needles that sit far from the rest of their section (possible wrong matches).
Usage: python3 scripts/geolocate.py [--apply]   (--apply merges accepted proposals into data/locations.json, never overwriting)
"""
import csv, difflib, glob, json, math, os, re, sys, unicodedata
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from needles_lib import ROOT, load_needles

D = lambda *p: os.path.join(ROOT, 'data', *p)
GEO = D('source', 'geolocation')
MAX_SECTION_DIST = 650     # m from the nearest located needle of the same section
MAX_REGION_DIST = 1200     # m from the nearest located needle of the same region (section without anchors)
CLEAR_MARGIN = 2.0         # a duplicate-named place must be this many times closer than the next one

STOP = {'el', 'la', 'els', 'les', 'l', 'lo', 'de', 'del', 'dels', 'd', 'den', 'na', 'en', 'o', 'i', 'a', 'sa', 'es'}
HEADS = {'serra', 'roca', 'roques', 'agulla', 'agulles', 'agulleta', 'punta', 'paret', 'contrafort', 'cap', 'serrat', 'serradet', 'carena',
         'miranda', 'mirador', 'turo', 'torre', 'morro', 'puntal', 'merlet', 'pedestal', 'esperó', 'espero', 'conjunt', 'boleta', 'bola'}
OTHER = {'coll', 'canal', 'cova', 'coves', 'font', 'pas', 'cami', 'torrent', 'clot', 'coma', 'balma', 'balmes', 'avenc', 'pou',
         'pla', 'bosc', 'creu', 'capella', 'ermita', 'refugi', 'drecera', 'escletxa', 'bassa', 'bassal', 'degotalls', 'estacio'}
ROCKISH = {'roca', 'roques', 'agulla', 'agulles', 'agulleta', 'punta'}
PARTS = {'merlet', 'contrafort', 'pedestal', 'carena', 'aresta', 'boleta', 'cara', 'esperó', 'espero', 'ullal'}   # a part of X lies at X
RELATIVE = re.compile(r'\b(sobre|sota|vena|veina|damunt|prop|davant|darrere)\b')   # "rock above X": X is only nearby
OCR = [(r'\bdeis\b', 'dels'), (r'esouer', 'esquer'), (r'oueixal', 'queixal'), (r'fara05', 'farao'), (r'faraci', 'farao'),
       (r'espeledlegs', 'espeleolegs'), (r'carouinyoli', 'carquinyoli'), (r'collbato\b', 'collbato'), (r'\bmix\b', 'xic')]

def fold(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    for a, b in OCR: s = re.sub(a, b, s)
    return s
def toks(s): return [{'serrat': 'serra'}.get(t, t) for t in re.sub(r'[^a-z0-9]+', ' ', fold(s)).split() if t not in STOP]
def key(s): return ' '.join(toks(s))
def head(s):
    t = toks(s); return t[0] if t else ''
def core(s):
    t = toks(s)
    while t and t[0] in HEADS: t = t[1:]
    return ' '.join(t)
def variants(name):
    base = re.sub(r'\([^)]*\)', ' ', name)
    parts = [p.strip() for p in re.split(r'\s+[oO]\s+|\s+-\s+|,\s*|\.\s+', base) if len(p.strip()) >= 3]
    return list(dict.fromkeys([name, base.strip(), *parts]))
def dist(a, b):
    (x1, y1), (x2, y2) = a, b
    k = math.cos(math.radians((y1 + y2) / 2))
    return math.hypot((x1 - x2) * k, y1 - y2) * 111_320

def load_places():
    places = []
    for f in sorted(glob.glob(os.path.join(GEO, 'icgc-geocoder-*.json'))):
        d = json.load(open(f, encoding='utf-8')); seen = set()
        for rows in d['queries'].values():
            for nom, lon, lat, layer in rows:
                if (nom, lon, lat) in seen: continue
                seen.add((nom, lon, lat))
                places.append({'name': nom, 'lon': lon, 'lat': lat, 'src': 'icgc', 'ref': f'ICGC toponímia ({layer})', 'semir': None})
    osm = json.load(open(os.path.join(GEO, 'montserrat-osm.geojson'), encoding='utf-8'))
    for f in osm['features']:
        p = f['properties']; lon, lat = f['geometry']['coordinates']; nm = p.get('name') or p.get('name:ca') or ''
        sem = p.get('CodiSemir')
        m = re.search(r'(?:^|\(|\.\s)(?:Roca|Cota)\s+(\d{1,3}[AB]?)\)?$', nm) or re.search(r'\((\d{2,3})\)$', nm)
        places.append({'name': nm, 'lon': lon, 'lat': lat, 'src': 'osm', 'ref': p.get('@id') or f.get('id'), 'semir': sem or (m.group(1) if m else None),
                       'alts': [x for x in [p.get('name:ca'), *(p.get('alt_name') or '').split(';')] if x and x != nm]})
    return places

def semir_set(n):
    s = n.get('semirRef') or ''
    return {x.strip().upper() for x in re.split(r'[-,i ]+', s) if x.strip()}

def main(apply=False):
    needles = load_needles()
    decisions = {d['needleId']: d for d in json.load(open(D('review', 'decisions.json'), encoding='utf-8'))}
    live = [n for n in needles if decisions.get(n['id'], {}).get('action') not in ('reject', 'merge')]
    byid = {n['id']: n for n in live}
    locs = json.load(open(D('locations.json'), encoding='utf-8'))
    have = {l['needleId']: (l['longitude'], l['latitude']) for l in locs}
    places = load_places()
    used_osm = {l.get('note') for l in locs if l.get('note')}

    # ── 1. candidates per unlocated needle ──
    def name_score(n, p):
        """(score, how). ≥ 0.8 may be accepted automatically (with the spatial check); 0.7–0.8 only goes to review."""
        names = [v for nm in [n['name'], *n.get('alternativeNames', [])] for v in variants(nm)]
        pn = [p['name'], *p.get('alts', [])]
        best, how = 0.0, ''
        for a in names:
            for b in pn:
                rel = bool(RELATIVE.search(fold(a))) and not RELATIVE.search(fold(b))     # "veïna de X" vs X (both relative = same name)
                ka, kb = key(a), key(b)
                if not ka or not kb: continue
                ha, hb = head(a), head(b)
                if hb in OTHER and ha != hb: continue                           # a col/canal/cova named like the needle is not the needle
                if ka == kb: return 1.0, 'nom exacte'
                ca, cb = core(a), core(b)
                if ca and cb and ca == cb and len(ca) >= 4:
                    sc = 0.9
                    if rel: sc, why = 0.75, 'nom relatiu («sobre/sota/veïna de…»)'
                    elif ca.split()[0] in ('sant', 'santa'): sc, why = 0.75, "porta el nom d'un lloc (capella, ermita…)"
                    elif ha in HEADS and hb in HEADS and ha != hb and ha not in PARTS:
                        # the book often says "Roca de X" where the map says "Agulla de X": same thing if it is right there
                        sc, why = (0.79 if {ha, hb} <= ROCKISH else 0.75), f'tipus diferent ({ha} / {hb})'
                    else: why = 'nom (sense «roca/agulla…»)'
                    best, how = max((best, how), (sc, why))
                if ca and ca == cb: continue
                r = difflib.SequenceMatcher(None, ca or ka, cb or kb).ratio()
                if r >= 0.88 and min(len(ca or ka), len(cb or kb)) >= 6:
                    sc = 0.8 if r >= 0.9 and not rel and (ha == hb or ha not in HEADS or hb not in HEADS or ha in PARTS) else 0.72
                    best, how = max((best, how), (sc, f'nom semblant ({r:.2f})'))
        return best, how

    anchors_sec = defaultdict(list); anchors_reg = defaultdict(list)
    for nid, c in have.items():
        if nid in byid: anchors_sec[byid[nid]['sectionId']].append(c); anchors_reg[byid[nid]['regionId']].append(c)
    def fit(n, c):
        a = anchors_sec.get(n['sectionId'])
        if a: d = min(dist(c, x) for x in a); return d, d <= MAX_SECTION_DIST, 'secció'
        a = anchors_reg.get(n['regionId'])
        if a: d = min(dist(c, x) for x in a); return d, d <= MAX_REGION_DIST, 'regió'
        return None, False, '—'

    cands = defaultdict(list)
    todo = [n for n in live if n['id'] not in have]
    for n in todo:
        sem = semir_set(n)
        for i, p in enumerate(places):
            if p['src'] == 'osm' and p['ref'] in used_osm: continue
            s, how = name_score(n, p)
            if p.get('semir') and p['semir'].upper() in sem:
                rel = bool(RELATIVE.search(fold(n['name']))) or 'cota' in fold(n['name']) and 'sota' in fold(n['name'])
                s, how = (0.75 if rel else max(s, 0.85) + (0.1 if s >= 0.8 else 0)), (how + ' + ' if how else '') + f"número de Semir {p['semir']}"
            if s >= 0.7: cands[n['id']].append((s, how, i))

    # ── 2. choose, with the spatial check ──
    proposals, review = {}, []
    claims = defaultdict(list)
    for nid, cs in cands.items():
        n = byid[nid]
        scored = []
        for s, how, i in cs:
            p = places[i]; d, ok, scope = fit(n, (p['lon'], p['lat']))
            scored.append((s, how, i, d, ok, scope))
        top = max(x[0] for x in scored)
        best = [x for x in scored if x[0] >= top - 0.05]
        # merge duplicates of the same toponym from the two sources (≤ 60 m apart): keep the ICGC one
        uniq = []
        for x in sorted(best, key=lambda x: (places[x[2]]['src'] != 'icgc', -x[0])):
            if not any(dist((places[x[2]]['lon'], places[x[2]]['lat']), (places[y[2]]['lon'], places[y[2]]['lat'])) < 60 for y in uniq): uniq.append(x)
        ok = sorted([x for x in uniq if x[4]], key=lambda x: x[3])
        if top < 0.79 or (top < 0.8 and not (ok and ok[0][3] <= 200)): ok = []    # weak evidence: a person decides
        if len(ok) == 1 or (len(ok) > 1 and ok[1][3] >= CLEAR_MARGIN * max(ok[0][3], 50)):
            claims[ok[0][2]].append((nid, ok[0]))
        else:
            for x in uniq:
                p = places[x[2]]
                review.append({'needle_id': nid, 'needle': n['name'], 'section': n['sectionId'], 'place': p['name'], 'source': p['src'], 'ref': p['ref'],
                               'latitude': p['lat'], 'longitude': p['lon'], 'match': x[1], 'distance_m': '' if x[3] is None else round(x[3]),
                               'reason': x[1] if top < 0.8 else 'diversos llocs possibles' if len(ok) > 1 else (f'lluny de la {x[5]}' if x[3] is not None else 'secció i regió sense referències')})
    for i, cl in claims.items():
        p = places[i]
        if len(cl) > 1:
            cl.sort(key=lambda c: (-c[1][0], c[1][3]))
            if cl[0][1][0] - cl[1][1][0] < 0.09:
                for nid, x in cl: review.append({'needle_id': nid, 'needle': byid[nid]['name'], 'section': byid[nid]['sectionId'], 'place': p['name'], 'source': p['src'], 'ref': p['ref'],
                                                 'latitude': p['lat'], 'longitude': p['lon'], 'match': x[1], 'distance_m': round(x[3]), 'reason': 'el mateix lloc per a diverses agulles'})
                continue
            # parts of the winner (Pedestal del Martell, Merlet de…) share its place; the rest go to review
            extra = [c for c in cl[1:] if head(byid[c[0]]['name']) in PARTS]
            for nid, x in cl[1:]:
                if (nid, x) not in extra: review.append({'needle_id': nid, 'needle': byid[nid]['name'], 'section': byid[nid]['sectionId'], 'place': p['name'], 'source': p['src'], 'ref': p['ref'],
                                                         'latitude': p['lat'], 'longitude': p['lon'], 'match': x[1], 'distance_m': round(x[3]), 'reason': f"el lloc és de {byid[cl[0][0]]['name']}"})
            cl = cl[:1] + extra
        for nid, x in cl:
            src = 'Institut Cartogràfic i Geològic de Catalunya, toponímia 1:5.000 (CC BY 4.0)' if p['src'] == 'icgc' else f"OpenStreetMap contributors (ODbL) [{p['ref']}]"
            proposals[nid] = {'needleId': nid, 'needleName': byid[nid]['name'], 'latitude': round(p['lat'], 7), 'longitude': round(p['lon'], 7), 'accuracy': 'approximate', 'source': src,
                              'matchedBy': 'name', 'note': f"{p['name']} — {x[1]}; a {round(x[3])} m de la {x[5]}" + (f" · {p['ref']}" if p['src'] == 'osm' else '')}

    # ── 3. sanity check of the existing locations ──
    outliers = []
    for l in locs:
        n = byid.get(l['needleId'])
        if not n: continue
        others = [have[m] for m in have if m != l['needleId'] and m in byid and byid[m]['sectionId'] == n['sectionId']]
        if len(others) >= 2:
            d = min(dist((l['longitude'], l['latitude']), o) for o in others)
            if d > 900: outliers.append({'needle_id': n['id'], 'needle': n['name'], 'section': n['sectionId'], 'distance_m': round(d), 'source': l['source']})

    json.dump({'generated': 'scripts/geolocate.py', 'accepted': sorted(proposals.values(), key=lambda r: r['needleId']), 'outliers': outliers},
              open(os.path.join(GEO, 'geolocate-proposals.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sug = defaultdict(list)
    for r in sorted(review, key=lambda r: (r['needle_id'], r['distance_m'] if r['distance_m'] != '' else 1e9)):
        sug[r['needle_id']].append({k: r[k] for k in ('place', 'source', 'ref', 'latitude', 'longitude', 'match', 'distance_m', 'reason')})
    json.dump(sug, open(os.path.join(GEO, 'geolocate-review.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    with open(os.path.join(GEO, 'geolocate-review.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, ['needle_id', 'needle', 'section', 'place', 'source', 'ref', 'latitude', 'longitude', 'match', 'distance_m', 'reason'])
        w.writeheader(); w.writerows(sorted(review, key=lambda r: (r['needle_id'], r['place'])))
    print(f'{len(todo)} needles without coordinates · {len(cands)} with a name/number candidate · {len(proposals)} accepted · '
          f'{len({r["needle_id"] for r in review})} to review · {len(outliers)} existing locations far from their section')
    if apply:
        add = [{k: v for k, v in r.items() if k != 'needleName'} for r in proposals.values() if r['needleId'] not in have]
        locs = sorted(locs + add, key=lambda r: r['needleId'])
        with open(D('locations.json'), 'w', encoding='utf-8') as f: f.write(json.dumps(locs, ensure_ascii=False, indent=1) + '\n')
        print(f'{len(add)} added to data/locations.json ({len(locs)} total)')

if __name__ == '__main__':
    main('--apply' in sys.argv)
