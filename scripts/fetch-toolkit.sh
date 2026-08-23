#!/usr/bin/env bash
# Shallow-clone the toolkit into .content/toolkit. History is irrelevant to rendering.
set -euo pipefail

REPO="${TOOLKIT_REPO:-https://github.com/sokpichdev/mobile-engineering-agents.git}"
REF="${TOOLKIT_REF:-main}"
DEST=".content/toolkit"

rm -rf "$DEST"
mkdir -p "$(dirname "$DEST")"

if [ -n "${TOOLKIT_TOKEN:-}" ]; then
  # Inject token for authenticated clone if toolkit repo is private
  AUTH_REPO=$(echo "$REPO" | sed -E "s|https://|https://x-access-token:${TOOLKIT_TOKEN}@|")
  git clone --depth 1 --branch "$REF" "$AUTH_REPO" "$DEST"
else
  git clone --depth 1 --branch "$REF" "$REPO" "$DEST"
fi

echo "Fetched $REPO@$REF into $DEST"
echo "  markdown files: $(find "$DEST" -name '*.md' -not -path '*/node_modules/*' | wc -l | tr -d ' ')"
