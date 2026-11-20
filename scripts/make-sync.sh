#!/usr/bin/env bash
# Code-only sync package (policy A, docs/sync.md): the local copy owns the editable data, so none of it is included.
# Usage: scripts/make-sync.sh out.tar.gz   -> extract on the other side with: tar xzf out.tar.gz --strip-components=1 --overwrite
set -euo pipefail
out="${1:?usage: make-sync.sh out.tar.gz}"; cd "$(dirname "$0")/.."; name="$(basename "$PWD")"
tar czf "$out" -C .. \
  --exclude="$name/node_modules" --exclude="$name/.svelte-kit" --exclude="$name/build" --exclude="$name/.git" --exclude="$name/test-results" \
  --exclude="$name/*.tar.gz" --exclude="$name/_sync" --exclude="$name/static/images" --exclude="$name/data" \
  "$name"
echo "wrote $out (code, scripts, tests, docs, config; no data/, no images)"
