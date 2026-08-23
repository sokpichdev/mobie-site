#!/usr/bin/env bash
# Check dist/ for broken internal links.
#
# This does NOT point linkinator at the dist/ directory directly. VitePress's cleanUrls
# option makes every internal link extension-less (e.g. /introduction, not
# /introduction.html); vitepress serves that correctly at runtime via sirv, but
# linkinator's own local static-file server has no such fallback (see
# node_modules/linkinator/build/src/server.js) — it does an exact file lookup, so every
# single clean-URL link would 404 as "broken" even when the site is perfectly fine. Serving
# dist/ via `vitepress preview` first and pointing linkinator at that live server gives
# linkinator the same clean-URL resolution real visitors get.
set -euo pipefail

PORT=4173
BASE="http://localhost:$PORT"

npx vitepress preview --port "$PORT" &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
  if curl -s -o /dev/null "$BASE/"; then break; fi
  sleep 0.2
done

# Skip true external hosts (github.com edit links, etc.) but NOT localhost — the preview
# server itself is also an http:// URL, so a naive `--skip 'https?://'` skips the crawl
# root too and silently checks nothing (0 links scanned). Also skip the handful of
# non-page targets .vitepress/config.ts's own `ignoreDeadLinks` already accepts, for the
# same reasons: LICENSE (non-markdown), .swiftlint.yml (config file), the PR template
# (lives under .github/, excluded), .claude/ (dot-directory, excluded), and the toolkit
# README's local dashboard link.
npx linkinator "$BASE" --recurse --silent \
  --skip 'https?://(?!localhost)|/LICENSE$|\.swiftlint\.yml$|PULL_REQUEST_TEMPLATE|/\.claude/|localhost:4981'
