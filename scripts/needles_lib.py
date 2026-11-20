"""Shared loader: the extracted needles plus the needles added by reviewers (data/review/additions.json), in book order.
Additions are inserted after the last needle of their section that precedes them in the book (by first page)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def _rd(p, default=None):
    f = os.path.join(ROOT, p)
    return json.load(open(f, encoding="utf-8")) if os.path.exists(f) else default
def load_needles():
    needles = _rd("data/needles.json"); add = _rd("data/review/additions.json", [])
    pending = list(add)
    while pending:                                                         # an addition may follow another addition: place those whose predecessor is already in
        ids = [n["id"] for n in needles]; ready = [a for a in pending if not a.get("after") or a["after"] in ids or a["after"] not in {x["id"] for x in pending}] or pending
        a = ready[0]; pending.remove(a)
        if a.get("after") in ids: idx = ids.index(a["after"])          # explicit position (set when the addition was placed)
        else: idx = max([i for i, n in enumerate(needles) if n["sectionId"] == a["sectionId"] and n["bookReferences"][0]["page"] <= a["bookReferences"][0]["page"]], default=len(needles) - 1)
        needles.insert(idx + 1, a)
    return needles
def load_sections():
    secs = _rd("data/sections.json")
    page = {n["id"]: n["bookReferences"][0]["page"] for n in load_needles()}
    order = {n["id"]: i for i, n in enumerate(load_needles())}
    for s in secs: s["needleIds"] = sorted(set(s["needleIds"]) | {a["id"] for a in _rd("data/review/additions.json", []) if a["sectionId"] == s["id"]}, key=lambda x: order.get(x, 10**9))
    return secs
