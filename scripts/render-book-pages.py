#!/usr/bin/env python3
"""Render the book PDF to one grayscale WebP per page: static/images/book/pNNN.webp (NNN = PDF page = printed page here).

Usage: render-book-pages.py "Montserrat Pam a Pam.pdf" [first last]
Needs poppler's pdftoppm and Pillow. Existing files are skipped. The output folder is git-ignored on purpose:
the page images are copyrighted (Publicacions de l'Abadia de Montserrat, 1977); see docs/book-pages.md.
"""
import os, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

pdf = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), "..", "static", "images", "book")
os.makedirs(out, exist_ok=True)
n = int(next(l.split()[1] for l in subprocess.check_output(["pdfinfo", pdf], text=True).splitlines() if l.startswith("Pages:")))
first, last = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1, n)

def render(p):
    dest = os.path.join(out, f"p{p:03d}.webp")
    if os.path.exists(dest):
        return 0
    with tempfile.TemporaryDirectory() as t:
        subprocess.check_call(["pdftoppm", "-r", "130", "-gray", "-png", "-f", str(p), "-l", str(p), pdf, os.path.join(t, "x")])
        png = next(os.path.join(t, f) for f in os.listdir(t))
        Image.open(png).convert("L").save(dest, "WEBP", quality=70, method=6)
    return 1

with ThreadPoolExecutor(2) as ex:
    done = sum(ex.map(render, range(first, last + 1)))
print(f"rendered {done} new pages ({first}-{last}) into {os.path.normpath(out)}")
