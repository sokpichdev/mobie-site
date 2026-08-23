#!/usr/bin/env bash
# Shallow-clone the toolkit into .content/toolkit. History is irrelevant to rendering.
set -euo pipefail

REPO="${TOOLKIT_REPO:-https://github.com/sokpichdev/mobile-engineering-agents.git}"
REF="${TOOLKIT_REF:-main}"
DEST=".content/toolkit"

rm -rf "$DEST"
mkdir -p "$(dirname "$DEST")"
git clone --depth 1 --branch "$REF" "$REPO" "$DEST"

echo "Fetched $REPO@$REF into $DEST"
echo "  markdown files: $(find "$DEST" -name '*.md' -not -path '*/node_modules/*' | wc -l | tr -d ' ')"
