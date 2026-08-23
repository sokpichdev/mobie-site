#!/usr/bin/env bash
# Copy site-owned files into the fetched toolkit tree. This is the ONLY write into
# .content/toolkit — it adds the landing page, which is site content, not toolkit content.
set -euo pipefail

DEST=".content/toolkit"

if [ ! -d "$DEST" ]; then
  echo "error: $DEST missing — run scripts/fetch-toolkit.sh first" >&2
  exit 1
fi

cp site/index.md "$DEST/index.md"
mkdir -p "$DEST/public"
cp -R site/public/. "$DEST/public/"

echo "Assembled landing page and public assets into $DEST"
