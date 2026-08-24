#!/usr/bin/env bash
# Clone the toolkit into .content/toolkit.
#
# Full commit history, blobless (--filter=blob:none): VitePress derives each page's
# "Last updated" from `git log -1` on the source file, so a --depth 1 clone would stamp
# every page with the clone date — a knowledge base whose pitch is being current cannot
# ship dates that are all today. The blob filter keeps the clone cheap: commit metadata
# is all the timestamps need, and file contents are fetched on checkout only.
set -euo pipefail

REPO="${TOOLKIT_REPO:-https://github.com/sokpichdev/mobile-engineering-agents.git}"
REF="${TOOLKIT_REF:-main}"
DEST=".content/toolkit"

rm -rf "$DEST"
mkdir -p "$(dirname "$DEST")"

if [ -n "${TOOLKIT_TOKEN:-}" ]; then
  # Inject token for authenticated clone if toolkit repo is private
  AUTH_REPO=$(echo "$REPO" | sed -E "s|https://|https://x-access-token:${TOOLKIT_TOKEN}@|")
  git clone --filter=blob:none --branch "$REF" "$AUTH_REPO" "$DEST"
else
  git clone --filter=blob:none --branch "$REF" "$REPO" "$DEST"
fi

echo "Fetched $REPO@$REF into $DEST"
echo "  markdown files: $(find "$DEST" -name '*.md' -not -path '*/node_modules/*' | wc -l | tr -d ' ')"
