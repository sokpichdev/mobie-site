# Field Manual — Production Pass

**Date:** 2026-09-08
**Status:** Approved for planning
**Scope:** Landing page composition + docs chrome. Content pages and information
architecture are explicitly out of scope.

## Problem

`mobie.sokpich.dev` already carries a deliberate, non-generic identity: the
"engineering field manual" palette (warm paper ground, rust ink accent, Source
Serif display over IBM Plex) landed in `fda5464`, and `theme.css` already
de-templatises most VitePress chrome — nav, sidebar rail, tables, outline,
pager, search shell.

The gap between this and production-grade is not coverage. It is craft and
information density:

1. **The hero shows a slogan, not the product.** The product is a structured
   knowledge base of 173 documents that routes work through four agent tiers.
   That is inherently visual and nobody else has it, yet the fold shows a
   headline and a lede.
2. **Proof is buried.** The before/after code contrast — the single most
   convincing asset on the page — sits below the hero, styled as a small
   side-by-side.
3. **Type and space are ad hoc.** `Landing.vue` uses one-off `clamp()` and
   `rem` values that exist nowhere else in the system. This is what makes a
   site read as one nice page rather than one system.
4. **Fonts are a render-blocking third-party request.** Three families over the
   Google Fonts CDN is the largest layout-shift and privacy liability on the
   site.

## Approach

Keep the field manual. Apply the rigour that Tier-1 reference sites (Turborepo,
Biome, Bun, Stripe docs) share, all of which is palette-independent: a strict
type ramp, a single spacing scale, hairlines as the only structural device,
one idea per viewport, and a hero that shows the product.

Rejected alternatives:

- **Pivot to the v0/Vercel dark-monochrome look.** Discards differentiation
  already earned, in favour of the most-cloned aesthetic on the internet.
- **Sticky product rail on the landing page (Stripe model).** Most code, most
  fragile, degrades to a linear scroll on mobile anyway. Reserved instead for
  install/usage docs pages where a persistent code panel earns its keep.

## Design

### 1. Design tokens — type ramp and spacing scale

New tokens in `.vitepress/theme/palette.css`, declared once on `:root`.

**Type ramp — four heading steps, no more.** Every heading on the landing page
and in the docs resolves to one of the first four; a fifth heading size is a
design bug, not a new token. Below body sit three utility steps for text that is
not a heading — captions, chips, annotations — so those do not have to round to
`body` or `label`, both of which look wrong at that role.

| Token | Role | Size |
|---|---|---|
| `--m-t-display` | h1, landing only | `clamp(2.75rem, 5.5vw, 4rem)` |
| `--m-t-title` | h2, section heads | `clamp(1.75rem, 2.6vw, 2.25rem)` |
| `--m-t-sub` | h3, card heads | `1.125rem` |
| `--m-t-body` | prose, lists | `1rem` |
| `--m-t-small` | card labels | `0.9rem` |
| `--m-t-micro` | chips, stat line, blurbs | `0.78rem` |
| `--m-t-fine` | annotations under code | `0.72rem` |
| `--m-t-label` | mono uppercase labels | `11px` |

**Spacing scale — one geometric series.** `--m-s-1` `0.5rem` through `--m-s-9`
`12rem`. Section rhythm is `--m-s-8` (`8rem`) on desktop, `--m-s-6` (`4rem`)
below `768px`. No landing-page rule may introduce a spacing value outside this
scale.

Both scales replace existing one-off values in `Landing.vue` and `theme.css`
rather than sitting alongside them. Completion check: no `margin`, `padding`,
`gap` or `font-size` declaration in `Landing.vue` may use a literal length —
every one resolves to a `--m-s-*` or `--m-t-*` token.

### 2. Self-hosted fonts

Replace the two `preconnect` links and the `fonts.googleapis.com` stylesheet in
`.vitepress/config.ts` with self-hosted WOFF2 subsets under
`site/public/fonts/`, declared with `@font-face` and `font-display: swap` in
`palette.css`.

Ship only the weights actually used — Plex Sans 400/500/600 + 400 italic, Plex
Mono 400/500, Source Serif 4 400/500/600 + 400/500 italic — latin subset only.
Preload the two faces that paint above the fold (Source Serif 500, Plex Sans
400).

Fonts are vendored into the repo, not fetched at build time: the build must not
gain a new network dependency.

### 3. Hero — the framed proof panel

The hero becomes a two-column layout: copy left, one bordered "field terminal"
frame right. Below `1024px` the frame moves under the copy at full width.

**Left column**

- Eyebrow `01 — THE PROBLEM` (existing device, retained)
- h1, unchanged copy
- Lede, unchanged copy
- CTA pair, unchanged
- **New:** an inventory stat line — `18 agents · 80 skills · 14 workflows ·
  11 checklists` — rendered from `theme.inventory`, mono, `--m-text-3`, sitting
  directly under the CTAs as a hairline-topped strip.

**Right column — the frame**

One bordered box, fixed height (`min-height: 26rem` desktop) so tab switches do
not reflow the page. A mono tab bar in the field-manual label voice, built on
the existing `ToolTabs.vue` pattern:

- `TREE` (default) — the real `.mobile-agents/` directory tree with per-section
  counts, generated at build time from the existing `collectPages` /
  `countInventory` in `.vitepress/toolkit-tree.ts` and passed through
  `themeConfig`. Each row links to that section's index. This is the tab that
  makes the frame unmistakably *this* product.
- `SESSION` — an agent session transcript ending in
  `Mobile Engineering Agents — loaded ✓`. **Ships as a static, hand-written but
  truthful transcript.** The panel reads its content from a single data module
  so a real recording (asciinema cast or GIF) can replace it later without
  touching the component. This is a known, accepted limitation of the initial
  implementation; it is not a real recording and must not be described as one.
- `BEFORE/AFTER` — the existing code contrast, moved out of its own section and
  into this tab, keeping its current copy and its `--m-negative` /
  `--m-positive` annotations.

The frame gets no shadow and no gradient. Structure is a `1px` hairline and the
tab bar's bottom rule, consistent with `ToolTabs.vue`.

**Tabs are progressive enhancement.** With JavaScript disabled all three panels
render stacked, so the proof is never hidden behind a script.

### 4. Tier routing — promoted to its own section

The routing diagram currently squeezed into the hero (`ROUTE` in `Landing.vue`)
moves out to a full-bleed section between the hero and the tier list, where it
has room to be a diagram rather than a list of chips: request enters, hands
down through the four numbered tiers with their live agent counts, exits
merge-ready. Hairline connectors, mono labels, accent used only on the active
hover target.

This section absorbs the `02 — THE TEAM` eyebrow; the existing tier list
becomes its detail view directly beneath, not a separate numbered chapter.

### 5. Chapter renumbering

Removing the contrast section and merging routing into the team chapter
renumbers the page:

| # | Section | Change |
|---|---|---|
| 01 | The problem (hero + frame) | rebuilt |
| 02 | The team (routing diagram + tier list) | merged |
| 03 | Install | unchanged |
| 04 | What's inside (inventory grid) | unchanged |
| 05 | Compatibility | unchanged |

### 6. Docs chrome — remaining gaps

The chrome already treated in `theme.css` stays as is. Three gaps close:

- **Footer.** Currently stock VitePress. Gets the hairline-and-mono treatment:
  rule above, mono meta line, links in accent ink.
- **Search results.** The shell is styled; the result rows, the "no results"
  state and the keyboard-hint chips are not.
- **Sticky code rail on install pages.** On an opted-in page, the code fences
  collapse into a persistent right-hand panel that follows the scroll,
  Stripe-style.

  Opt-in is a path allowlist in `.vitepress/config.ts`, **not** page
  frontmatter: docs content is fetched from the upstream toolkit repo by
  `scripts/fetch-toolkit.sh` and assembled unmodified, so this site cannot add
  frontmatter to those pages without diverging from upstream. The allowlist
  starts with the introduction/install page only.

  Falls back to inline fences below `1280px` and with JavaScript disabled.

## Non-goals

- No palette change. The rust/paper system stays exactly as committed.
- No new dependencies. No Tailwind, no component library, no animation library.
- No content or information-architecture changes. Section index pages,
  cross-linking and the generated sidebar are untouched.
- No recorded terminal session. The `SESSION` tab ships static.

## Testing

- `npm test` — existing Vitest suites (`render-fixes`, `vpre`, `toolkit-tree`)
  must stay green; `toolkit-tree` gains a case for the tree data passed to
  `themeConfig`.
- `npm run build` — `assert-build.ts` and the linkinator crawl must pass,
  including every new link out of the tree panel.
- **Manual, both themes:** light and dark, at `375px`, `768px`, `1024px` and
  `1440px`.
- **Progressive enhancement:** with JavaScript disabled, all three hero panels
  render and the sticky rail falls back to inline fences.
- **Accessibility:** tab bar is keyboard-operable with correct `role="tablist"`
  semantics and a visible focus ring; the routing diagram carries an
  `aria-label` describing the flow; contrast ratios hold in both themes.
- **Fonts:** no request to `fonts.googleapis.com` or `fonts.gstatic.com` in the
  built output.

## Files touched

| File | Change |
|---|---|
| `.vitepress/theme/palette.css` | type ramp, spacing scale, `@font-face` |
| `.vitepress/theme/Landing.vue` | hero rebuild, routing promoted, chapters renumbered |
| `.vitepress/theme/HeroFrame.vue` | **new** — the tabbed proof panel |
| `.vitepress/theme/TierRoute.vue` | **new** — the routing diagram |
| `.vitepress/theme/CodeRail.vue` | **new** — sticky code rail |
| `.vitepress/theme/theme.css` | footer, search results, rail layout |
| `.vitepress/toolkit-tree.ts` | export tree shape for the frame |
| `.vitepress/config.ts` | drop Google Fonts, pass tree through `themeConfig` |
| `site/public/fonts/` | **new** — vendored WOFF2 subsets |
