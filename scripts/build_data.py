#!/usr/bin/env python3
"""Builds data/regions.json, sections.json, needles.json.

Structure (regions/sections/page numbers) comes from the book's "Index General".
Needles come from data/source/original-extraction/*-candidates.json (unreviewed).
Source files are read-only inputs; this script never modifies them.
"""
import json, re, os
D = os.path.join(os.path.dirname(__file__), "..", "data")
ORD = ["primera","segona","tercera","quarta","cinquena","sisena","setena","vuitena","novena","desena","onzena","dotzena","tretzena","catorzena","quinzena","setzena","dissetena","divuitena","dinovena","vintena","vint-i-unena","vint-i-dosena","vint-i-tresena","vint-i-quatrena","vint-i-cinquena","vint-i-sisena","vint-i-setena","vint-i-vuitena","vint-i-novena","trentena","trenta-unena","trenta-dosena","trenta-tresena","trenta-quatrena","trenta-cinquena"]
SECS = [("Sant Pau Vell",10),("Pallers",17),("Saques",29),("Bola",59),("Centenar",83),("Frares",101),("Miranda del Príncep",125),("Comes",133),("Naps",145),("Roca roja",153),("Palomera",159),("Faraó",167),("Montgrós",173),("Ecos",181),("Sant Jeroni",191),("Serrat del Moro",211),("Sant Antoni",225),("Albarda",237),("Coll de Muset",243),("Pollegons",259),("Bellavista",267),("La Plantació",273),("Sant Pere",287),("Les Gorres",293),("Sant Joan",305),("Boirafua",309),("Serrat dels Monjos",315),("Serra Llarga",319),("Sant Miquel",323),("Santa Cova",327),("Monestir",337),("Mullapans",359),("Torrent Escuder",363),("Flautats",367),("Cavall Bernat",379)]
# (name, slug, first section number, last section number, printed page start or None if not verified)
REGS = [("Agulles","agulles",1,4,8),("Frares Encantats","frares-encantats",5,7,81),("Ecos","ecos",8,14,131),("Sant Jeroni o el Tabor","sant-jeroni",15,19,189),("Magdalenes o Tebes","magdalenes",20,29,None),("Tebaida","tebaida",30,35,None)]
BOOK_END_PAGE = 391  # Biografies start p.392
regions, sections = [], []
for ri,(name,slug,a,b,pg) in enumerate(REGS,1):
    rid=f"r{ri:02d}"
    regions.append({"id":rid,"name":name,"slug":slug,"sectionIds":[f"s{n:02d}" for n in range(a,b+1)],
                    "bookReference":({"pageStart":pg} if pg else {})})
    for n in range(a,b+1):
        start=SECS[n-1][1]; end=(SECS[n][1]-1) if n<35 else BOOK_END_PAGE
        sections.append({"id":f"s{n:02d}","regionId":rid,"name":SECS[n-1][0],"order":n,
                         "description":None,"needleIds":[],"bookReference":{"pageStart":start,"pageEnd":end}})
# page-start of OCR-garbled "191" recorded as "1-91" in the index text; corrected, see docs/editorial-policy.md
sec_by_page=lambda p: next(s for s in sections if s["bookReference"]["pageStart"]<=p<=s["bookReference"]["pageEnd"])
needles, unresolved, seen = [], [], {}
cand=json.load(open(os.path.join(D,"source/original-extraction/all-candidates.json")))
for c in cand["candidates"]:
    ref=re.sub(r"\s+","",c["semirRef"]) if c["semirRef"] else None
    key=ref or re.sub(r"\W+","",c["name"].lower())
    if c["confidence"]=="dash" or key in seen:
        unresolved.append({"candidate":c,"reason":"duplicate of earlier entry" if key in seen else "dash-style heading (map label or secondary reference)"})
        continue
    sec=sec_by_page(c["pdfPage"])
    nid=f"n{len(needles)+1:04d}"; seen[key]=nid
    name=re.sub(r"\s+"," ",c["name"]).title().replace(" De "," de ").replace(" Del "," del ").replace(" La "," la ").replace(" El "," el ").replace(" Les "," les ")
    needles.append({"id":nid,"name":name,"alternativeNames":[],"regionId":sec["regionId"],"sectionId":sec["id"],
        "images":[],"bookReferences":[{"page":c["pdfPage"],"type":"description"}],
        **({"semirRef":ref} if ref else {}),
        "metadata":{"extractionStatus":"unreviewed","extractionNote":"OCR heading heuristic; name capitalisation and Semir ref unverified" if ref else "OCR heading heuristic (no Semir number cited); may be a map label or non-needle feature"}})
    sec["needleIds"].append(nid)
for n,f in (("regions",regions),("sections",sections),("needles",needles)):
    json.dump(f,open(os.path.join(D,n+".json"),"w"),ensure_ascii=False,indent=1)
json.dump(unresolved,open(os.path.join(D,"source/original-extraction/unresolved.json"),"w"),ensure_ascii=False,indent=1)
print(len(regions),"regions",len(sections),"sections",len(needles),"needles",len(unresolved),"unresolved")
