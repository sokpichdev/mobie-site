#!/usr/bin/env bash
# Copy site-owned files into the fetched toolkit tree: the landing page and public assets,
# which are site content, not toolkit content. gen-indexes.ts runs after this and also
# writes into .content/toolkit (generated directory index pages).
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
