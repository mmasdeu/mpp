#!/usr/bin/env python3
"""OCR every page of the book with Tesseract (Catalan) at 300 dpi.

Usage: ocr-book.py "Montserrat Pam a Pam.pdf" [first last]
Output (git-ignored, copyrighted text): data/ocr/pages/pNNN.txt (plain text) and pNNN.tsv (words with confidence).
Needs: pdftoppm, tesseract with the `cat` model (apt: tesseract-ocr-cat). Existing outputs are skipped.
"""
import os, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

pdf = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), "..", "data", "ocr", "pages")
os.makedirs(out, exist_ok=True)
n = int(next(l.split()[1] for l in subprocess.check_output(["pdfinfo", pdf], text=True).splitlines() if l.startswith("Pages:")))
first, last = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1, n)

def ocr(p):
    base = os.path.join(out, f"p{p:03d}")
    if os.path.exists(base + ".txt") and os.path.exists(base + ".tsv"):
        return 0
    with tempfile.TemporaryDirectory() as t:
        subprocess.check_call(["pdftoppm", "-r", "300", "-gray", "-png", "-f", str(p), "-l", str(p), pdf, os.path.join(t, "x")])
        png = os.path.join(t, next(f for f in os.listdir(t)))
        subprocess.check_call(["tesseract", png, base, "-l", "cat", "--psm", "4", "txt", "tsv"], stderr=subprocess.DEVNULL, env={**os.environ, "OMP_THREAD_LIMIT": "1"})
    return 1

with ThreadPoolExecutor(2) as ex:
    done = sum(ex.map(ocr, range(first, last + 1)))
print(f"OCR'd {done} new pages ({first}-{last}) into {os.path.normpath(out)}")
