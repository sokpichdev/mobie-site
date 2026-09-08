# Field Manual Production Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `mobie.sokpich.dev` to production-grade craft without changing its "engineering field manual" identity — tokenised type and spacing, self-hosted fonts, a hero that shows the product instead of a slogan, and the last three gaps in the docs chrome.

**Architecture:** This is a VitePress 1.6 site whose content is cloned from an upstream toolkit repo at build time. The custom theme lives entirely in `.vitepress/theme/`. Work splits cleanly into two layers: **pure TypeScript modules** that run at build time (`toolkit-tree.ts` and new sibling data modules), which are unit-tested with Vitest; and **Vue single-file components plus CSS**, which have no test harness in this repo and are verified instead by post-build assertions in `scripts/assert-build.ts` plus a manual checklist. Every task below is structured around that split.

**Tech Stack:** VitePress 1.6.4, Vue 3.5 (SFC, `<script setup>`), TypeScript 5.9, Vitest 2.1, plain CSS with custom properties (no preprocessor, no Tailwind), `tsx` for build scripts.

**Spec:** `docs/superpowers/specs/2026-09-08-field-manual-production-pass-design.md`

## Global Constraints

- **No new dependencies.** Nothing may be added to `package.json`. This is a hard constraint from the spec and it is why Vue components are verified by build assertions rather than component tests — there is no `jsdom` and no `@vue/test-utils`, and adding them is out of scope.
- **No palette change.** Every colour token in `.vitepress/theme/palette.css` (`--m-bg` `#f7f5f0`, `--m-accent` `#a3412b`, the `html.dark` block, and the whole `--vp-*` mapping) stays byte-identical. This pass adds tokens; it does not edit existing ones.
- **No content or information-architecture changes.** `.content/toolkit/` is cloned by `scripts/fetch-toolkit.sh` and must never be edited. Nothing in `site/` other than `site/public/fonts/` changes.
- **Structure is hairlines only.** `1px solid var(--m-border)`. No `box-shadow`, no `gradient`, no `filter: blur()` anywhere in new CSS. The one existing exception is the nav's `backdrop-filter`, which stays.
- **Weights are 400 / 500 / 600 only.** IBM Plex ships static steps; no other weight may be requested or used.
- **Motion is ≤ 200ms** and only on `:hover`, `:focus-visible`, and tab activation. No scroll-triggered or entrance animation.
- **Progressive enhancement is mandatory.** With JavaScript disabled the three hero proof panels all render (stacked) and the sticky code rail falls back to inline fences. Proof is never hidden behind a script.
- **Verify with `npm test` and `npm run build`.** `npm run build` runs `prebuild` (fetch + assemble + gen-indexes) then `vitepress build` then `postbuild` (`scripts/assert-build.ts`). A task is not done until both are green.
- **Commit messages** follow the repo's existing Conventional Commits style (`feat(landing):`, `fix(build):`, `refactor(theme):`). **No Claude attribution, no `Claude-Session:` footer, no `Co-Authored-By` trailer** — per the machine's global CLAUDE.md.

---

### Task 1: Type ramp and spacing scale

Replace the ad-hoc `clamp()` and `rem` literals scattered through `Landing.vue` with two token scales declared once in `palette.css`. This is the change that makes the site read as one system rather than one nice page, and it must land first because every later task consumes these tokens.

**Files:**
- Modify: `.vitepress/theme/palette.css` (append a new block after the `:root` colour block, before the `html.dark` block)
- Modify: `.vitepress/theme/Landing.vue` (the `<style scoped>` block, lines 245–845)
- Test: `.vitepress/theme/tokens.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties available to every later task —
  - Type: `--m-t-display`, `--m-t-title`, `--m-t-sub`, `--m-t-body`, `--m-t-label`
  - Space: `--m-s-1` … `--m-s-9`
  - Section rhythm: `--m-s-section` (responsive; `8rem` desktop, `4rem` under 768px)

- [ ] **Step 1: Write the failing test**

Create `.vitepress/theme/tokens.test.ts`. This test is the completion check from the spec, made executable: it reads the `<style>` block of `Landing.vue` and asserts that no sizing declaration uses a raw length.

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const THEME = join(__dirname)

function styleBlock(sfcPath: string): string {
  const src = readFileSync(sfcPath, 'utf8')
  const start = src.indexOf('<style')
  return src.slice(src.indexOf('>', start) + 1, src.lastIndexOf('</style>'))
}

/**
 * Lengths that are allowed to stay literal: zero, hairlines, keyword values and
 * percentages. Everything else must resolve to a --m-s-* or --m-t-* token, or the
 * spacing system is only advisory.
 */
const ALLOWED = /^(0|auto|inherit|initial|unset|none|1px|-1px|[\d.]+%|var\(--[\w-]+\)|calc\([^)]*var\(--[\w-]+\)[^)]*\))$/

const SIZING_PROPS = ['margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'gap', 'row-gap', 'column-gap', 'font-size']

describe('palette.css token scales', () => {
  const palette = readFileSync(join(THEME, 'palette.css'), 'utf8')

  it('declares the heading ramp plus the utility steps', () => {
    for (const token of ['--m-t-display', '--m-t-title', '--m-t-sub', '--m-t-body',
      '--m-t-small', '--m-t-micro', '--m-t-fine', '--m-t-label']) {
      expect(palette).toContain(`${token}:`)
    }
  })

  it('declares a nine-step spacing scale and a section rhythm token', () => {
    for (let i = 1; i <= 9; i++) {
      expect(palette).toContain(`--m-s-${i}:`)
    }
    expect(palette).toContain('--m-s-section:')
  })

  it('does not alter the committed colour tokens', () => {
    expect(palette).toContain('--m-bg: #f7f5f0')
    expect(palette).toContain('--m-accent: #a3412b')
  })
})

describe('Landing.vue uses the scales', () => {
  it('has no literal sizing lengths', () => {
    const css = styleBlock(join(THEME, 'Landing.vue'))
    const offenders: string[] = []

    for (const line of css.split('\n')) {
      const m = line.match(/^\s*([a-z-]+)\s*:\s*([^;]+);/)
      if (!m) continue
      const [, prop, rawValue] = m
      if (!SIZING_PROPS.includes(prop)) continue
      for (const part of rawValue.trim().split(/\s+(?![^(]*\))/)) {
        if (!ALLOWED.test(part.trim())) offenders.push(`${prop}: ${part.trim()}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run .vitepress/theme/tokens.test.ts`
Expected: FAIL. The `palette.css` assertions fail with "expected ... to contain `--m-t-display:`", and the `Landing.vue` assertion fails with a long `offenders` array (`font-size: 11px`, `margin: 0 0 1.4rem`, `padding: 4.5rem 1.5rem 8rem`, and so on).

- [ ] **Step 3: Add the scales to `palette.css`**

Insert the token declarations into `.vitepress/theme/palette.css` immediately after the existing `--m-radius-sm: 4px;` line, **inside** the first `:root` block, and put the media query **after** that block's closing brace. Do not touch any existing declaration.

Inside `:root`, after `--m-radius-sm: 4px;`:

```css
  /* ── Type ramp ────────────────────────────────────────────────────────────
     Four heading steps — display / title / sub — plus body, and three utility
     steps below it. Every heading on the site resolves to one of the first four;
     a fifth heading size is a design bug, not a new token.

     (Refinement to spec §1: the spec lists the four heading steps and the label
     step. Converting Landing.vue revealed three legitimate sub-body sizes already
     in use — .inventory__label 0.9rem, .tools__list 0.78rem, .contrast__note
     0.72rem — that are not headings and would otherwise have had to round to
     `body` or `label`, both of which would look wrong. They are tokenised here
     rather than left as literals.) */
  --m-t-display: clamp(2.75rem, 5.5vw, 4rem);
  --m-t-title: clamp(1.75rem, 2.6vw, 2.25rem);
  --m-t-sub: 1.125rem;
  --m-t-body: 1rem;
  --m-t-small: 0.9rem;
  --m-t-micro: 0.78rem;
  --m-t-fine: 0.72rem;
  --m-t-label: 11px;

  /* ── Spacing scale ────────────────────────────────────────────────────────
     One geometric series. No layout rule may introduce a length outside it —
     .vitepress/theme/tokens.test.ts enforces this for Landing.vue. */
  --m-s-1: 0.5rem;
  --m-s-2: 0.75rem;
  --m-s-3: 1rem;
  --m-s-4: 1.5rem;
  --m-s-5: 2rem;
  --m-s-6: 4rem;
  --m-s-7: 6rem;
  --m-s-8: 8rem;
  --m-s-9: 12rem;

  /* The rhythm between numbered chapters. One token so the whole page breathes
     together and collapses together on small screens. */
  --m-s-section: var(--m-s-8);
```

Then, immediately after that `:root` block's closing brace (and before the `html.dark` block), add:

```css
@media (max-width: 768px) {
  :root {
    --m-s-section: var(--m-s-6);
  }
}
```

- [ ] **Step 4: Convert `Landing.vue`'s styles to the tokens**

Work through the `<style scoped>` block replacing every literal in a `SIZING_PROPS` declaration. The mapping is mechanical — round to the nearest step, never invent an in-between value:

| Was | Becomes |
|---|---|
| `0.5rem`, `0.42rem`, `0.2rem` | `var(--m-s-1)` |
| `0.75rem`, `0.79rem`, `0.85rem` | `var(--m-s-2)` |
| `1rem`, `1.1rem`, `0.9rem` | `var(--m-s-3)` |
| `1.4rem`, `1.5rem`, `1.6rem`, `1.8rem` | `var(--m-s-4)` |
| `2rem`, `2.2rem` | `var(--m-s-5)` |
| `3rem`, `4.5rem` | `var(--m-s-6)` |
| `7rem` (`.landing section` margin-bottom) | `var(--m-s-section)` |
| `8rem` (`.landing` padding-bottom) | `var(--m-s-8)` |
| `font-size: 11px` (`.eyebrow` and peers) | `var(--m-t-label)` |
| `font-size: clamp(2.5rem, 6vw, 4.1rem)` (`h1`) | `var(--m-t-display)` |
| `h2` font-size | `var(--m-t-title)` |
| `h3` font-size | `var(--m-t-sub)` |
| body/lede font-size | `var(--m-t-body)` |
| `font-size: 0.9rem` (`.inventory__label`) | `var(--m-t-small)` |
| `font-size: 0.78rem`, `0.79rem` (`.tools__list li`, `.inventory__blurb`) | `var(--m-t-micro)` |
| `font-size: 0.72rem` and smaller notes | `var(--m-t-fine)` |

Two rules need care:

```css
/* Was: padding: 4.5rem 1.5rem 8rem; */
.landing {
  max-width: 68rem;
  margin: 0 auto;
  padding: var(--m-s-6) var(--m-s-4) var(--m-s-8);
  color: var(--m-text);
}

/* Was: margin-bottom: 7rem; */
.landing section {
  margin-bottom: var(--m-s-section);
  position: relative;
}
```

The existing `@media (max-width: 720px)` block at the end of the file sets `.landing { padding-top: 3rem }` — change that to `var(--m-s-6)` and leave the rest of the block alone.

`max-width` and `min-height` are deliberately **not** in `SIZING_PROPS`: measure-based widths like `max-width: 20ch` and `68rem` are typography decisions, not spacing, and forcing them onto the scale would make the layout worse.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run .vitepress/theme/tokens.test.ts`
Expected: PASS, 4 tests.

If `offenders` is still non-empty, the array names each remaining declaration — fix those specific lines rather than widening `ALLOWED`.

- [ ] **Step 6: Run the full suite and build**

Run: `npm test`
Expected: PASS — `render-fixes`, `vpre`, `toolkit-tree`, `tokens`.

Run: `npm run build`
Expected: `All build assertions passed.`

- [ ] **Step 7: Check both themes visually**

Run: `npm run dev` and open `http://localhost:5173/`. Toggle light/dark with the nav switch. The page should look **the same as before this task** — this is a refactor, not a redesign. Any visible shift means a value was rounded to the wrong step.

- [ ] **Step 8: Commit**

```bash
git add .vitepress/theme/palette.css .vitepress/theme/Landing.vue .vitepress/theme/tokens.test.ts
git commit -m "refactor(theme): promote type ramp and spacing scale to tokens"
```

---

### Task 2: Self-hosted fonts

Three families over the Google Fonts CDN is the site's largest layout-shift and privacy liability, and it is a render-blocking third-party request on every page. Vendor them.

**Files:**
- Create: `site/public/fonts/*.woff2` (10 files)
- Modify: `.vitepress/theme/palette.css` (prepend `@font-face` declarations at the top of the file)
- Modify: `.vitepress/config.ts:93-101` (the `head` array — remove two `preconnect` links and the stylesheet link, add two `preload` links)
- Modify: `scripts/assert-build.ts` (new assertion 9)
- Test: `.vitepress/theme/fonts.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: the same three `--m-font*` families as before, now locally served. No token names change.

- [ ] **Step 1: Download the WOFF2 subsets**

**This step needs network access.** `gwfh.mranftl.com` is a long-standing mirror that serves Google Fonts as downloadable subsets. Run from the repo root:

```bash
mkdir -p site/public/fonts && cd site/public/fonts

curl -L -o plex-sans.zip \
  'https://gwfh.mranftl.com/api/fonts/ibm-plex-sans?download=zip&subsets=latin&variants=regular,italic,500,600&formats=woff2'
curl -L -o plex-mono.zip \
  'https://gwfh.mranftl.com/api/fonts/ibm-plex-mono?download=zip&subsets=latin&variants=regular,500&formats=woff2'
curl -L -o source-serif.zip \
  'https://gwfh.mranftl.com/api/fonts/source-serif-4?download=zip&subsets=latin&variants=regular,italic,500,500italic,600&formats=woff2'

unzip -o -j '*.zip' '*.woff2' && rm -f *.zip
ls
cd ../../..
```

Expected: 10 `.woff2` files, each roughly 15–40 KB. Filenames follow the pattern `ibm-plex-sans-v<N>-latin-regular.woff2`.

If the mirror is unreachable, the fallback is to fetch `https://fonts.googleapis.com/css2?...` with a modern browser `User-Agent` (which makes Google return WOFF2 URLs), then `curl` each `src: url(...)` out of the returned CSS. Do **not** proceed to Step 2 with missing files — a partial set silently falls back to system fonts.

- [ ] **Step 2: Write the failing test**

Create `.vitepress/theme/fonts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..')
const palette = readFileSync(join(ROOT, '.vitepress/theme/palette.css'), 'utf8')
const config = readFileSync(join(ROOT, '.vitepress/config.ts'), 'utf8')

describe('fonts are self-hosted', () => {
  it('ships every declared face as a local woff2', () => {
    const files = new Set(readdirSync(join(ROOT, 'site/public/fonts')))
    const referenced = [...palette.matchAll(/url\('\/fonts\/([^']+)'\)/g)].map((m) => m[1])

    expect(referenced.length).toBeGreaterThanOrEqual(10)
    for (const file of referenced) {
      expect(files.has(file), `${file} referenced by palette.css but not vendored`).toBe(true)
    }
  })

  it('declares every face with font-display: swap', () => {
    const faces = palette.split('@font-face').slice(1)
    expect(faces.length).toBeGreaterThanOrEqual(10)
    for (const face of faces) {
      expect(face.slice(0, face.indexOf('}'))).toContain('font-display: swap')
    }
  })

  it('requests no weight outside 400/500/600', () => {
    const weights = [...palette.matchAll(/font-weight:\s*(\d+)/g)].map((m) => m[1])
    expect([...new Set(weights)].sort()).toEqual(['400', '500', '600'])
  })

  it('no longer references Google Fonts from config', () => {
    expect(config).not.toContain('fonts.googleapis.com')
    expect(config).not.toContain('fonts.gstatic.com')
  })

  it('preloads the two faces that paint above the fold', () => {
    expect(config).toContain("rel: 'preload'")
    expect(config).toContain('source-serif')
    expect(config).toContain('ibm-plex-sans')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run .vitepress/theme/fonts.test.ts`
Expected: FAIL — `palette.css` has no `@font-face` blocks, and `config.ts` still contains `fonts.googleapis.com`.

- [ ] **Step 4: Add `@font-face` declarations to `palette.css`**

Prepend to the very top of `.vitepress/theme/palette.css`, above the existing header comment. Substitute the real filenames from Step 1 — the `v<N>` version segment changes over time, so copy them from `ls site/public/fonts`.

```css
/* ─────────────────────────────────────────────────────────────────────────────
   Self-hosted faces. Latin subset, WOFF2 only, weights 400/500/600 exactly as
   used. Served from site/public/fonts/ so the site makes no third-party request
   and no layout shift waits on a CDN. `swap` over `optional`: the field-manual
   look depends on the serif, so a late swap beats never showing it.
   ───────────────────────────────────────────────────────────────────────────── */

@font-face {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/ibm-plex-sans-v24-latin-regular.woff2') format('woff2');
}

@font-face {
  font-family: 'IBM Plex Sans';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/ibm-plex-sans-v24-latin-italic.woff2') format('woff2');
}

@font-face {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/ibm-plex-sans-v24-latin-500.woff2') format('woff2');
}

@font-face {
  font-family: 'IBM Plex Sans';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/ibm-plex-sans-v24-latin-600.woff2') format('woff2');
}

@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/ibm-plex-mono-v19-latin-regular.woff2') format('woff2');
}

@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/ibm-plex-mono-v19-latin-500.woff2') format('woff2');
}

@font-face {
  font-family: 'Source Serif 4';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/source-serif-4-v8-latin-regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Source Serif 4';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/source-serif-4-v8-latin-italic.woff2') format('woff2');
}

@font-face {
  font-family: 'Source Serif 4';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/source-serif-4-v8-latin-500.woff2') format('woff2');
}

@font-face {
  font-family: 'Source Serif 4';
  font-style: italic;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/source-serif-4-v8-latin-500italic.woff2') format('woff2');
}

@font-face {
  font-family: 'Source Serif 4';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/source-serif-4-v8-latin-600.woff2') format('woff2');
}
```

- [ ] **Step 5: Swap the `head` entries in `config.ts`**

In `.vitepress/config.ts`, delete these four entries from the `head` array (currently lines 94–101):

```ts
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400;1,8..60,500&display=swap'
      }
    ],
```

and put this in their place:

```ts
    // Fonts are vendored under site/public/fonts and declared in palette.css, so the
    // site makes no third-party request. Preload only the two faces that paint above
    // the fold — the h1's serif and the lede's sans. Preloading more would compete
    // with them for bandwidth and make first paint slower, not faster.
    [
      'link',
      {
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        href: '/fonts/source-serif-4-v8-latin-500.woff2',
        crossorigin: ''
      }
    ],
    [
      'link',
      {
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        href: '/fonts/ibm-plex-sans-v24-latin-regular.woff2',
        crossorigin: ''
      }
    ],
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run .vitepress/theme/fonts.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 7: Add the build assertion**

Append to `scripts/assert-build.ts`, immediately before the final `console.log('')` / failure block:

```ts
// 9. No page in the built output reaches out to Google Fonts. Self-hosting is only
//    real if nothing re-introduces the CDN — a stray <link> in a future head entry or
//    an @import inside a component's <style> would silently undo it, and the browser
//    would still render correctly, so nothing else would catch it.
const htmlFiles: string[] = []
function collectHtml(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) collectHtml(full)
    else if (entry.endsWith('.html') || entry.endsWith('.css')) htmlFiles.push(full)
  }
}
collectHtml(DIST)
const cdnLeaks = htmlFiles.filter((f) => {
  const body = readFileSync(f, 'utf8')
  return body.includes('fonts.googleapis.com') || body.includes('fonts.gstatic.com')
})
check(
  `no Google Fonts requests in ${htmlFiles.length} built files`,
  cdnLeaks.length === 0,
  cdnLeaks.slice(0, 5).join(', ')
)

// 10. The vendored faces actually shipped. A missing file degrades silently to a
//     system font, which looks "fine" and hides the regression.
const fontDir = join(DIST, 'fonts')
const shippedFonts = existsSync(fontDir) ? readdirSync(fontDir).filter((f) => f.endsWith('.woff2')) : []
check(`vendored fonts in dist: ${shippedFonts.length}`, shippedFonts.length >= 10)
```

- [ ] **Step 8: Build and verify**

Run: `npm run build`
Expected: `All build assertions passed.`, including `ok    no Google Fonts requests in <N> built files` and `ok    vendored fonts in dist: 11`.

Then confirm by hand:

```bash
grep -rl 'fonts.googleapis\|fonts.gstatic' dist/ || echo "clean"
```

Expected: `clean`.

- [ ] **Step 9: Check rendering in a browser**

Run `npm run preview`, open the site, and in DevTools → Network filter by `Font`. Every request must be same-origin `/fonts/*.woff2`. Confirm the h1 renders in Source Serif (not a fallback serif) in both light and dark.

- [ ] **Step 10: Commit**

```bash
git add site/public/fonts .vitepress/theme/palette.css .vitepress/config.ts .vitepress/theme/fonts.test.ts scripts/assert-build.ts
git commit -m "perf(theme): self-host Plex and Source Serif, drop Google Fonts"
```

---

### Task 3: Toolkit tree data for the hero frame

The `TREE` tab needs the real `.mobile-agents/` directory shape with per-section counts, computed at build time and handed to the client through `themeConfig`. This is pure TypeScript in an already-tested module, so it gets a proper TDD cycle.

**Files:**
- Modify: `.vitepress/toolkit-tree.ts` (append after `countInventory`, near `SECTION_ORDER` at line ~76)
- Modify: `.vitepress/config.ts:219` (the `themeConfig` object)
- Test: `.vitepress/toolkit-tree.test.ts` (add a `describe` block; the fixture in `beforeAll` already exists)

**Interfaces:**
- Consumes: `collectPages(root): Page[]` and `countInventory(pages): Record<string, number>`, both already exported from `.vitepress/toolkit-tree.ts`.
- Produces:
  ```ts
  export type TreeRow = { slug: string; label: string; count: number; link: string }
  export function buildToolkitTree(pages: Page[]): TreeRow[]
  ```
  Available on the client as `theme.value.tree` (typed `TreeRow[]`), consumed by Task 4.

- [ ] **Step 1: Write the failing test**

Append to `.vitepress/toolkit-tree.test.ts`. Add `buildToolkitTree` to the existing import list at the top of the file first.

```ts
describe('buildToolkitTree', () => {
  it('returns one row per non-empty section, in SECTION_ORDER', () => {
    const rows = buildToolkitTree(collectPages(root))
    expect(rows.map((r) => r.slug)).toEqual(['agents', 'skills', 'templates', 'examples'])
  })

  it('carries the display label and the section index link', () => {
    const rows = buildToolkitTree(collectPages(root))
    const agents = rows.find((r) => r.slug === 'agents')!
    expect(agents.label).toBe('Agents')
    expect(agents.link).toBe('/agents/')
  })

  it('uses the same counts as countInventory', () => {
    const pages = collectPages(root)
    const counts = countInventory(pages)
    for (const row of buildToolkitTree(pages)) {
      expect(row.count).toBe(counts[row.slug])
    }
  })

  it('omits sections with no content', () => {
    const rows = buildToolkitTree(collectPages(root))
    expect(rows.some((r) => r.count === 0)).toBe(false)
    expect(rows.some((r) => r.slug === 'workflows')).toBe(false)
  })
})
```

The fixture built in `beforeAll` contains `agents/` (2 files), `skills/ui/ios/` (1 file), `templates/ios/{swiftui_screen,uikit_mvp_screen}/` (2 dirs) and `examples/chat_app/` (1 dir) — hence the four expected slugs. It has no `workflows/`, which is what the last assertion exercises.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run .vitepress/toolkit-tree.test.ts`
Expected: FAIL at import — `buildToolkitTree is not exported by ./toolkit-tree`.

- [ ] **Step 3: Implement `buildToolkitTree`**

Append to `.vitepress/toolkit-tree.ts`, directly below the `SECTION_ORDER` declaration so the two stay adjacent:

```ts
/** One row of the hero's directory-tree panel. */
export type TreeRow = { slug: string; label: string; count: number; link: string }

/**
 * The toolkit's top-level shape, as the landing page's TREE panel renders it: the real
 * directories, their real document counts, in the site's reading order.
 *
 * Sections with no content are dropped rather than rendered as zero — a tree that shows
 * empty branches reads as a broken build, and the counts are the panel's whole point.
 * Anything present in the toolkit but missing from SECTION_ORDER is appended
 * alphabetically, so a new upstream section appears on the landing page without a code
 * change here.
 */
export function buildToolkitTree(pages: Page[]): TreeRow[] {
  const counts = countInventory(pages)
  const ordered = SECTION_ORDER.map(([slug, label]) => ({ slug, label }))
  const known = new Set(ordered.map((s) => s.slug))

  const extras = Object.keys(counts)
    .filter((slug) => !known.has(slug))
    .sort()
    .map((slug) => ({ slug, label: slug[0].toUpperCase() + slug.slice(1) }))

  return [...ordered, ...extras]
    .filter(({ slug }) => (counts[slug] ?? 0) > 0)
    .map(({ slug, label }) => ({ slug, label, count: counts[slug], link: `/${slug}/` }))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run .vitepress/toolkit-tree.test.ts`
Expected: PASS — the existing suites plus the four new cases.

- [ ] **Step 5: Pass the tree through `themeConfig`**

In `.vitepress/config.ts`, add `buildToolkitTree` to the import from `./toolkit-tree` (lines 5–13), then extend `themeConfig` at line 219:

```ts
  themeConfig: {
    inventory: countInventory(pages),
    // The hero's TREE panel renders the real toolkit shape. Computed here, at build
    // time, from the same fetched clone the docs are generated from — so the landing
    // page cannot claim a section or a count the site does not actually contain.
    tree: buildToolkitTree(pages),
    nav: [
```

- [ ] **Step 6: Verify the data reaches the client**

Run: `npm run build`, then:

```bash
npx tsx -e "import { collectPages, buildToolkitTree } from './.vitepress/toolkit-tree'; console.table(buildToolkitTree(collectPages('.content/toolkit')))"
```

Expected output from the final command — the real numbers, which are the ones the hero will show:

```
[
  { slug: 'agents',       label: 'Agents',       count: 17, link: '/agents/' },
  { slug: 'skills',       label: 'Skills',       count: 54, link: '/skills/' },
  { slug: 'workflows',    label: 'Workflows',    count: 13, link: '/workflows/' },
  { slug: 'checklists',   label: 'Checklists',   count: 10, link: '/checklists/' },
  { slug: 'standards',    label: 'Standards',    count: 10, link: '/standards/' },
  { slug: 'architecture', label: 'Architecture', count: 6,  link: '/architecture/' },
  { slug: 'prompts',      label: 'Prompts',      count: 10, link: '/prompts/' },
  { slug: 'templates',    label: 'Templates',    count: 12, link: '/templates/' },
  { slug: 'examples',     label: 'Examples',     count: 5,  link: '/examples/' }
]
```

These are `countInventory`'s derived counts, which are **not** raw file counts: README
and generated `index.md` scaffolding is excluded, and `templates`/`examples` count leaf
*directories* rather than files. They match the `landing counts match derived` line in a
clean `npm run build`.

Counts may differ if the upstream toolkit has changed — that is expected and correct. What must hold is nine rows, all non-zero, in this order.

- [ ] **Step 7: Commit**

```bash
git add .vitepress/toolkit-tree.ts .vitepress/toolkit-tree.test.ts .vitepress/config.ts
git commit -m "feat(landing): derive toolkit tree data for the hero panel"
```

---

### Task 4: The hero frame

Rebuild the hero as two columns: copy left, one bordered frame right holding all three proofs behind mono tabs. This is the task that closes the spec's central gap — the hero currently shows a slogan, not the product.

**Files:**
- Create: `.vitepress/theme/hero-data.ts` (the session transcript and the stat line, as data)
- Create: `.vitepress/theme/HeroFrame.vue`
- Modify: `.vitepress/theme/Landing.vue` (hero section markup, lines 110–170; remove the `.contrast` block, lines 138–162; remove the `ROUTE` const at line 71 — Task 5 owns its replacement)
- Modify: `.vitepress/theme/index.ts` (register the component)
- Modify: `scripts/assert-build.ts` (assertion 11)
- Test: `.vitepress/theme/hero-data.test.ts` (create)

**Interfaces:**
- Consumes: `TreeRow[]` from `theme.value.tree` (Task 3), `--m-s-*` / `--m-t-*` (Task 1).
- Produces:
  ```ts
  // hero-data.ts
  export type TranscriptLine = { kind: 'prompt' | 'output' | 'ok'; text: string }
  export const SESSION_TRANSCRIPT: TranscriptLine[]
  export const CONTRAST: { label: string; code: string; note: string; tone: 'bad' | 'good' }[]
  export function statLine(tree: TreeRow[], take?: number): string
  ```
  `HeroFrame.vue` takes one prop: `tree: TreeRow[]`.

- [ ] **Step 1: Write the failing test**

Create `.vitepress/theme/hero-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SESSION_TRANSCRIPT, CONTRAST, statLine } from './hero-data'
import type { TreeRow } from '../toolkit-tree'

const TREE: TreeRow[] = [
  { slug: 'agents', label: 'Agents', count: 18, link: '/agents/' },
  { slug: 'skills', label: 'Skills', count: 80, link: '/skills/' },
  { slug: 'workflows', label: 'Workflows', count: 14, link: '/workflows/' },
  { slug: 'checklists', label: 'Checklists', count: 11, link: '/checklists/' },
  { slug: 'standards', label: 'Standards', count: 11, link: '/standards/' }
]

describe('statLine', () => {
  it('renders the first four sections as a mono stat line', () => {
    expect(statLine(TREE)).toBe('18 agents · 80 skills · 14 workflows · 11 checklists')
  })

  it('honours an explicit take', () => {
    expect(statLine(TREE, 2)).toBe('18 agents · 80 skills')
  })

  it('degrades to whatever exists rather than padding', () => {
    expect(statLine(TREE.slice(0, 1))).toBe('18 agents')
    expect(statLine([])).toBe('')
  })
})

describe('SESSION_TRANSCRIPT', () => {
  it('ends on the load confirmation the toolkit actually prints', () => {
    const last = SESSION_TRANSCRIPT[SESSION_TRANSCRIPT.length - 1]
    expect(last.kind).toBe('ok')
    expect(last.text).toContain('Mobile Engineering Agents — loaded ✓')
  })

  it('opens with a user prompt', () => {
    expect(SESSION_TRANSCRIPT[0].kind).toBe('prompt')
  })
})

describe('CONTRAST', () => {
  it('is exactly one bad column and one good column', () => {
    expect(CONTRAST.map((c) => c.tone)).toEqual(['bad', 'good'])
  })

  it('keeps the committed copy', () => {
    expect(CONTRAST[0].note).toContain('Massive View Controller')
    expect(CONTRAST[1].note).toContain('Keychain')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run .vitepress/theme/hero-data.test.ts`
Expected: FAIL — `Failed to resolve import "./hero-data"`.

- [ ] **Step 3: Write `hero-data.ts`**

Create `.vitepress/theme/hero-data.ts`. The contrast copy is lifted verbatim from the block currently at `Landing.vue:138-162` — moving it, not rewriting it.

```ts
import type { TreeRow } from '../toolkit-tree'

export type TranscriptLine = { kind: 'prompt' | 'output' | 'ok'; text: string }

/**
 * The SESSION panel's contents.
 *
 * This is a hand-written transcript, not a recording. It is truthful — every line is
 * something the toolkit actually produces — but it is authored, and the site must never
 * present it as captured output. It lives here, as data, so that dropping in a real
 * asciinema cast later is a change to one module and not to the component.
 */
export const SESSION_TRANSCRIPT: TranscriptLine[] = [
  { kind: 'prompt', text: '> Build a Profile screen that loads /me and stores the auth token securely.' },
  { kind: 'output', text: 'Reading .mobile-agents/CLAUDE.md' },
  { kind: 'output', text: 'Loading agents/ios_architect · agents/networking_expert' },
  { kind: 'output', text: 'Loading skills/security/keychain_storage' },
  { kind: 'output', text: 'Applying standards/swift_style · checklists/code_review' },
  { kind: 'ok', text: 'Mobile Engineering Agents — loaded ✓' }
]

/** The BEFORE/AFTER panel. Copy moved verbatim from the landing page's contrast block. */
export const CONTRAST: { label: string; code: string; note: string; tone: 'bad' | 'good' }[] = [
  {
    tone: 'bad',
    label: 'Without the toolkit',
    code: `class LoginVC: UIViewController {\n  UserDefaults.standard.set(\n    token, forKey: "token")\n  // 400 more lines\n}`,
    note: 'Massive View Controller · token in plaintext · no tests'
  },
  {
    tone: 'good',
    label: 'With the toolkit',
    code: `final class LoginViewModel {\n  let auth: AuthUseCase\n  func submit() async throws {\n    try await auth.login()\n  }\n}`,
    note: 'OAuth2 + PKCE · Keychain · MVVM · typed errors · tests'
  }
]

/**
 * The stat line under the hero CTAs: "18 agents · 80 skills · 14 workflows · 11 checklists".
 *
 * Takes the first `take` sections in tree order rather than the largest, so the line stays
 * stable as the toolkit grows and always leads with agents — the thing the page is about.
 * Renders whatever exists; it never pads to reach `take`.
 */
export function statLine(tree: TreeRow[], take = 4): string {
  return tree
    .slice(0, take)
    .map((row) => `${row.count} ${row.label.toLowerCase()}`)
    .join(' · ')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run .vitepress/theme/hero-data.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write `HeroFrame.vue`**

Create `.vitepress/theme/HeroFrame.vue`. Note the two non-obvious requirements: a fixed `min-height` so switching tabs never reflows the page, and a `<noscript>`-equivalent fallback — because Vue hydrates, a real `<noscript>` is not enough, so the panels are rendered with `v-show` (all present in the DOM) and the tab bar is hidden until mounted.

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { TreeRow } from '../toolkit-tree'
import { SESSION_TRANSCRIPT, CONTRAST } from './hero-data'

defineProps<{ tree: TreeRow[] }>()

const TABS = ['Tree', 'Session', 'Before/After'] as const

const active = ref(0)

/**
 * Until the component mounts, every panel renders — so a reader with JavaScript off, or
 * one who reaches the page before hydration, sees all three proofs stacked rather than a
 * single tab bar that does nothing. The tab UI is the enhancement, not the content.
 */
const interactive = ref(false)
onMounted(() => (interactive.value = true))

function shown(i: number): boolean {
  return !interactive.value || active.value === i
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
  event.preventDefault()
  const delta = event.key === 'ArrowRight' ? 1 : -1
  active.value = (active.value + delta + TABS.length) % TABS.length
  const bar = event.currentTarget as HTMLElement
  ;(bar.children[active.value] as HTMLButtonElement).focus()
}
</script>

<template>
  <div class="frame" :class="{ 'frame--static': !interactive }">
    <div v-show="interactive" class="frame__bar" role="tablist" aria-label="Proof" @keydown="onKeydown">
      <button
        v-for="(tab, i) in TABS"
        :key="tab"
        type="button"
        role="tab"
        :aria-selected="active === i"
        :tabindex="active === i ? 0 : -1"
        :class="{ 'is-active': active === i }"
        @click="active = i"
      >
        {{ tab }}
      </button>
    </div>

    <!-- TREE — the real toolkit shape, counted at build time. -->
    <div v-show="shown(0)" class="frame__panel" role="tabpanel">
      <p class="frame__static-label">The toolkit</p>
      <p class="tree__root">.mobile-agents/</p>
      <ul class="tree">
        <li v-for="(row, i) in tree" :key="row.slug">
          <a :href="row.link">
            <span class="tree__branch">{{ i === tree.length - 1 ? '└──' : '├──' }}</span>
            <span class="tree__name">{{ row.slug }}/</span>
            <span class="tree__dots" aria-hidden="true" />
            <span class="tree__count">{{ row.count }}</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- SESSION — authored transcript, not a recording. See hero-data.ts. -->
    <div v-show="shown(1)" class="frame__panel" role="tabpanel">
      <p class="frame__static-label">A session</p>
      <ol class="session">
        <li v-for="line in SESSION_TRANSCRIPT" :key="line.text" :class="`session--${line.kind}`">
          {{ line.text }}
        </li>
      </ol>
    </div>

    <!-- BEFORE/AFTER — the code contrast, moved here from its own section. -->
    <div v-show="shown(2)" class="frame__panel" role="tabpanel">
      <p class="frame__static-label">The difference</p>
      <div v-for="col in CONTRAST" :key="col.tone" class="contrast" :class="`contrast--${col.tone}`">
        <p class="contrast__label">{{ col.label }}</p>
        <pre><code>{{ col.code }}</code></pre>
        <p class="contrast__note">{{ col.note }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.frame {
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius);
  background: var(--m-surface);
  min-height: 26rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Pre-hydration and no-JS: panels stack, so nothing is hidden behind a script. */
.frame--static .frame__panel + .frame__panel {
  border-top: 1px solid var(--m-border);
}

.frame__static-label {
  display: none;
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--m-text-3);
  margin: 0 0 var(--m-s-2);
}

.frame--static .frame__static-label {
  display: block;
}

.frame__bar {
  display: flex;
  border-bottom: 1px solid var(--m-border);
  background: var(--m-bg-alt);
}

.frame__bar button {
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--m-text-3);
  padding: var(--m-s-2) var(--m-s-3);
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  cursor: pointer;
  transition: color 0.12s ease, border-color 0.12s ease;
}

.frame__bar button:hover {
  color: var(--m-text);
}

.frame__bar button.is-active {
  color: var(--m-accent);
  border-bottom-color: var(--m-accent);
}

.frame__bar button:focus-visible {
  outline: 2px solid var(--m-accent);
  outline-offset: -2px;
}

.frame__panel {
  flex: 1;
  padding: var(--m-s-4);
  font-family: var(--m-font-mono);
  font-size: 0.8rem;
  line-height: 1.75;
}

/* ── Tree ─────────────────────────────────────────────────────────────────── */
.tree__root {
  color: var(--m-text-2);
  margin: 0 0 var(--m-s-1);
}

.tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tree a {
  display: flex;
  align-items: baseline;
  gap: var(--m-s-1);
  color: var(--m-text-2);
  text-decoration: none;
  padding: 1px 0;
  transition: color 0.12s ease;
}

.tree a:hover {
  color: var(--m-accent);
}

.tree__branch {
  color: var(--m-text-3);
}

.tree__dots {
  flex: 1;
  border-bottom: 1px dotted var(--m-border-strong);
  transform: translateY(-3px);
}

.tree__count {
  color: var(--m-text);
  font-variant-numeric: tabular-nums;
}

/* ── Session ──────────────────────────────────────────────────────────────── */
.session {
  list-style: none;
  margin: 0;
  padding: 0;
  color: var(--m-text-2);
}

.session li {
  padding: 1px 0;
}

.session--prompt {
  color: var(--m-text);
}

.session--ok {
  color: var(--m-positive);
  margin-top: var(--m-s-2);
}

/* ── Contrast ─────────────────────────────────────────────────────────────── */
.contrast + .contrast {
  margin-top: var(--m-s-4);
}

.contrast__label {
  font-size: var(--m-t-label);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--m-text-3);
  margin: 0 0 var(--m-s-1);
}

.contrast pre {
  margin: 0;
  padding: var(--m-s-2);
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius-sm);
  background: var(--m-bg);
  overflow-x: auto;
}

.contrast code {
  font-size: 0.75rem;
}

.contrast__note {
  margin: var(--m-s-1) 0 0;
  font-size: 0.72rem;
}

.contrast--bad .contrast__note {
  color: var(--m-negative);
}

.contrast--good .contrast__note {
  color: var(--m-positive);
}

@media (max-width: 1024px) {
  .frame {
    min-height: 0;
  }
}
</style>
```

- [ ] **Step 6: Register the component**

In `.vitepress/theme/index.ts`, add the import and the registration alongside the existing ones:

```ts
import HeroFrame from './HeroFrame.vue'
```

and inside `enhanceApp`:

```ts
    app.component('HeroFrame', HeroFrame)
```

- [ ] **Step 7: Rebuild the hero in `Landing.vue`**

In the `<script setup>` block: add the imports and the derived values.

```ts
import { statLine } from './hero-data'
import type { TreeRow } from '../toolkit-tree'

const tree = computed<TreeRow[]>(() => theme.value.tree ?? [])
const stats = computed(() => statLine(tree.value))
```

Delete the `ROUTE` const (line 71) — Task 5 replaces it. Leave `TIERS`, `INSTALL_STEPS`, `TOOLS`, `INVENTORY_ROWS` and `copy()` untouched.

Replace the whole `<section class="hero">` block (lines 110–170, through the closing `</section>` after the CTA div) with:

```html
    <!-- ── Hero ─────────────────────────────────────────── -->
    <section class="hero">
      <div class="hero__copy">
        <p class="eyebrow">01 — The problem</p>
        <h1>
          Turn your AI coding agent into a
          <em>Senior mobile engineer</em>
        </h1>
        <p class="lede">
          Architecture, security, testing and standards — so the code your agent generates is
          production-grade, not just plausible.
        </p>

        <div class="cta">
          <a class="btn btn--primary" href="#install">Get started</a>
          <a class="btn" href="/introduction">Read the docs</a>
        </div>

        <p v-if="stats" class="hero__stats">{{ stats }}</p>
      </div>

      <div class="hero__frame">
        <HeroFrame :tree="tree" />
      </div>
    </section>
```

Then in `<style scoped>`, replace the `.hero` rule and delete every `.contrast*` rule — they now live in `HeroFrame.vue`. The `@media (max-width: 720px)` block at the end of the file also names `.contrast`; change that rule to `.tier { grid-template-columns: 1fr; gap: var(--m-s-3); }` so it no longer targets a class this file has stopped defining.

Then add:

```css
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--m-s-6);
  align-items: start;
}

.hero__stats {
  font-family: var(--m-font-mono);
  font-size: var(--m-t-micro);
  color: var(--m-text-3);
  border-top: 1px solid var(--m-border);
  padding-top: var(--m-s-3);
  margin: var(--m-s-5) 0 0;
}

@media (max-width: 1024px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--m-s-5);
  }
}
```

- [ ] **Step 8: Add the build assertion**

Append to `scripts/assert-build.ts`, before the failure block:

```ts
// 11. The hero's three proof panels reached the built HTML. They render server-side
//     (v-show, not v-if) precisely so a reader without JavaScript still sees all three —
//     asserting on the markup is therefore also the no-JS regression test.
const heroChecks: Array<[string, string]> = [
  ['tree panel', 'tree__root'],
  ['session panel', 'Mobile Engineering Agents — loaded ✓'],
  ['before/after panel', 'contrast__note'],
  ['stat line', 'hero__stats']
]
for (const [label, needle] of heroChecks) {
  check(`hero ${label} rendered`, index.includes(needle))
}

// 12. The tree panel's counts match the derived counts, in order — the same guarantee
//     assertion 5 gives the inventory grid. A tree that drifts from the real toolkit is
//     worse than no tree, because it is proof that lies.
const treeRendered = [...index.matchAll(/tree__count[^>]*>(\d+)/g)].map((m) => Number(m[1]))
const treeExpected = buildToolkitTree(pages).map((r) => r.count)
check(
  `hero tree counts match derived: [${treeRendered}] vs [${treeExpected}]`,
  JSON.stringify(treeRendered) === JSON.stringify(treeExpected)
)
```

Add `buildToolkitTree` to the existing import from `../.vitepress/toolkit-tree` at the top of the file.

- [ ] **Step 9: Run everything**

Run: `npm test`
Expected: PASS — all suites.

Run: `npm run build`
Expected: `All build assertions passed.` including the four `hero ... rendered` lines and `hero tree counts match derived`.

- [ ] **Step 10: Verify in a browser, including with JavaScript off**

Run `npm run dev`. Check:
- Two columns at ≥1024px; the frame stacks below the copy under 1024px.
- Clicking each tab switches panels with **no page reflow** — the frame's height is constant.
- Arrow keys move between tabs; focus ring is visible.
- Tree rows link to `/agents/`, `/skills/`, etc.
- Both themes.

Then disable JavaScript (DevTools → Settings → Debugger → Disable JavaScript) and reload. Expected: the tab bar disappears, all three panels render stacked with their `The toolkit` / `A session` / `The difference` labels, separated by hairlines.

- [ ] **Step 11: Commit**

```bash
git add .vitepress/theme/hero-data.ts .vitepress/theme/hero-data.test.ts .vitepress/theme/HeroFrame.vue .vitepress/theme/Landing.vue .vitepress/theme/index.ts scripts/assert-build.ts
git commit -m "feat(landing): show the toolkit in the hero behind a proof frame"
```

---

### Task 5: Promote the tier routing diagram

The routing diagram was crammed into the hero, where it read as a row of chips. Extract it into its own component and give it the `02 — The team` chapter, with the tier list as its detail view directly beneath.

**Files:**
- Create: `.vitepress/theme/TierRoute.vue`
- Modify: `.vitepress/theme/Landing.vue` (the `#tiers` section; move the `.route*` styles out)
- Modify: `.vitepress/theme/index.ts`
- Modify: `scripts/assert-build.ts` (assertion 13)

**Interfaces:**
- Consumes: nothing from earlier tasks beyond the token scales.
- Produces: `TierRoute.vue` taking `tiers: { n: string; name: string; count: number }[]`.

- [ ] **Step 1: Write `TierRoute.vue`**

The markup is lifted from the `<ol class="route">` block currently at `Landing.vue:121-136` and its styles from the `.route*` rules in the same file, with the sizing literals converted to tokens per Task 1's mapping.

```vue
<script setup lang="ts">
defineProps<{ tiers: { n: string; name: string; count: number }[] }>()
</script>

<template>
  <ol class="route" aria-label="How a request flows through the agent tiers">
    <li class="route__end">
      <span class="route__name">Your request</span>
    </li>
    <li v-for="tier in tiers" :key="tier.n" class="route__tier">
      <a :href="`#tier-${tier.n}`">
        <span class="route__n">{{ tier.n }}</span>
        <span class="route__name">{{ tier.name }}</span>
        <span class="route__count">{{ tier.count }} agents</span>
      </a>
    </li>
    <li class="route__end route__end--done">
      <span class="route__name">Merge-ready</span>
    </li>
  </ol>
</template>

<style scoped>
/* Full-bleed within the landing's measure: the diagram is the section, not an
   illustration beside it. Connectors are hairlines with a rotated square as the
   arrowhead — no SVG, no icon font. */
.route {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: stretch;
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius);
  background: var(--m-surface);
}

.route > li {
  display: flex;
  align-items: center;
  flex: 1;
}

.route > li + li::before {
  content: '';
  flex: 0 0 var(--m-s-4);
  height: 1px;
  background: var(--m-border-strong);
}

.route__end {
  flex: 0 0 auto;
  padding: var(--m-s-4);
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--m-text-3);
}

.route__end--done {
  color: var(--m-positive);
}

.route__tier a {
  display: block;
  flex: 1;
  padding: var(--m-s-4) var(--m-s-3);
  text-decoration: none;
  color: inherit;
  border-left: 1px solid var(--m-border);
  transition: background-color 0.15s ease;
}

.route__tier:hover a {
  background: var(--m-accent-wash);
}

.route__n {
  display: block;
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  color: var(--m-accent);
  letter-spacing: 0.09em;
}

.route__name {
  display: block;
  font-family: var(--m-font-serif);
  font-size: var(--m-t-sub);
  color: var(--m-text);
  margin-top: var(--m-s-1);
}

.route__count {
  display: block;
  font-family: var(--m-font-mono);
  font-size: 0.72rem;
  color: var(--m-text-3);
  margin-top: var(--m-s-1);
}

@media (max-width: 900px) {
  .route {
    flex-direction: column;
  }

  .route > li {
    flex-direction: column;
    align-items: stretch;
  }

  .route > li + li::before {
    flex: 0 0 var(--m-s-4);
    width: 1px;
    height: var(--m-s-4);
    margin: 0 auto;
  }

  .route__tier a {
    border-left: none;
    border-top: 1px solid var(--m-border);
  }

  .route__end {
    text-align: center;
  }
}
</style>
```

- [ ] **Step 2: Register it**

In `.vitepress/theme/index.ts`, add `import TierRoute from './TierRoute.vue'` and `app.component('TierRoute', TierRoute)`.

- [ ] **Step 3: Wire it into `Landing.vue`**

Add the derived prop to `<script setup>`, replacing the `ROUTE` const deleted in Task 4:

```ts
/** The routing diagram reads its tiers from the same source as the tier list below it. */
const route = TIERS.map((t) => ({ n: t.n, name: t.name, count: t.agents.length }))
```

Replace the opening of the `#tiers` section so the diagram leads and the list follows, and give each tier an id so the diagram's anchors resolve:

```html
    <!-- ── The team: routing diagram, then the roster ──── -->
    <section id="tiers" class="tiers">
      <p class="eyebrow">02 — The team</p>
      <h2>You don't get an assistant. You get a team.</h2>
      <p class="lede">
        Specialist roles organised into four tiers that hand off to each other. Higher tiers
        set constraints lower tiers must respect.
      </p>

      <TierRoute :tiers="route" />

      <ol class="tier-list">
        <li v-for="tier in TIERS" :key="tier.n" :id="`tier-${tier.n}`" class="tier">
```

The rest of the `tier-list` markup is unchanged. In `<style scoped>`, delete every `.route*` rule and the `.route` cases in the `@media (max-width: 720px)` block — they now live in `TierRoute.vue`. Add spacing for the new adjacency:

```css
.tier-list {
  margin-top: var(--m-s-6);
}
```

- [ ] **Step 4: Add the build assertion**

Append to `scripts/assert-build.ts`:

```ts
// 13. The landing page's chapters are numbered 01–05 with no gaps. Sections were merged
//     and removed in this pass; a stale eyebrow is invisible in review but obvious to a
//     reader, and nothing else in the build would catch it.
const eyebrows = [...index.matchAll(/eyebrow[^>]*>\s*(\d{2})\s*—/g)].map((m) => m[1])
check(
  `landing chapters numbered sequentially: [${eyebrows}]`,
  JSON.stringify(eyebrows) === JSON.stringify(['01', '02', '03', '04', '05'])
)
```

- [ ] **Step 5: Run everything**

Run: `npm test` — Expected: PASS.
Run: `npm run build` — Expected: `All build assertions passed.`, including `landing chapters numbered sequentially: [01,02,03,04,05]`.

- [ ] **Step 6: Verify in a browser**

`npm run dev`. Check: the diagram spans the full measure as a single bordered strip; the four tiers show live agent counts (2 / 5 / 5 / 3); clicking a tier scrolls to its entry in the list below; it stacks vertically under 900px; hover wash appears in both themes.

- [ ] **Step 7: Commit**

```bash
git add .vitepress/theme/TierRoute.vue .vitepress/theme/Landing.vue .vitepress/theme/index.ts scripts/assert-build.ts
git commit -m "feat(landing): promote tier routing to its own chapter"
```

---

### Task 6: Footer and search-result chrome

The last two places where stock VitePress leaks through the field manual.

**Files:**
- Modify: `.vitepress/theme/theme.css` (append two sections at the end)

**Interfaces:**
- Consumes: the token scales from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Style the footer**

Append to `.vitepress/theme/theme.css`:

```css
/* ── Footer ─────────────────────────────────────────────────────────────────
   Stock VitePress centres the footer on a filled band. Here it is a hairline
   rule and two lines of mono meta, left-aligned with the content above it. */
.VPFooter {
  border-top: 1px solid var(--m-border);
  background: transparent !important;
  padding: var(--m-s-5) var(--m-s-4);
}

.VPFooter .container {
  text-align: left;
}

.VPFooter .message,
.VPFooter .copyright {
  font-family: var(--m-font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.01em;
  line-height: 1.8;
  color: var(--m-text-3);
}

.VPFooter .copyright {
  margin-top: var(--m-s-1);
}

.VPFooter a {
  color: var(--m-text-2);
  text-decoration: none;
  border-bottom: 1px solid var(--m-border-strong);
  transition: color 0.15s ease, border-color 0.15s ease;
}

.VPFooter a:hover {
  color: var(--m-accent);
  border-bottom-color: var(--m-accent-line);
}

/* ── Search results ─────────────────────────────────────────────────────────
   The shell is already styled above; the rows, the empty state and the keyboard
   hints are not, and they are what a reader actually looks at. */
.VPLocalSearchBox .result {
  border: 1px solid transparent;
  border-radius: var(--m-radius-sm);
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

.VPLocalSearchBox .result.selected {
  border-color: var(--m-accent-line);
  background: var(--m-accent-wash);
}

.VPLocalSearchBox .result .title {
  font-size: 0.92rem;
  color: var(--m-text);
}

.VPLocalSearchBox .result .titles .title-icon,
.VPLocalSearchBox .result .titles .text {
  color: var(--m-text-3);
}

.VPLocalSearchBox .result mark {
  background: var(--m-accent-wash);
  color: var(--m-accent);
  font-weight: 500;
  padding: 0 2px;
  border-radius: 2px;
}

.VPLocalSearchBox .excerpt-wrapper {
  border-top: 1px solid var(--m-border);
}

.VPLocalSearchBox .excerpt {
  background: var(--m-surface);
}

/* Empty state and the footer hints — mono label voice, like every other label. */
.VPLocalSearchBox .search-keyboard-shortcuts,
.VPLocalSearchBox .search-keyboard-shortcuts span {
  font-family: var(--m-font-mono);
  font-size: var(--m-t-label);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--m-text-3);
}

.VPLocalSearchBox .search-keyboard-shortcuts kbd {
  font-family: var(--m-font-mono);
  background: var(--m-bg-alt);
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius-sm);
  box-shadow: none;
  color: var(--m-text-2);
}
```

- [ ] **Step 2: Verify in a browser**

Run `npm run dev` and open a docs page (e.g. `/agents/`).

- Footer: left-aligned, hairline rule above, mono meta, links underlined with a hairline that turns rust on hover. Both themes.
- Search: press `/` or click the search box. Type `keychain`. Check the selected row's rust wash and border, the highlighted `mark` on matched terms, the excerpt panel's hairline, and the mono keyboard hints at the bottom. Arrow through results and confirm the selection styling tracks. Then search for a string with no hits (`zzzzz`) and confirm the empty state reads correctly.

There is no automated check here: these are VitePress's own components, styled from outside, and asserting on their internal class names in `assert-build.ts` would break on any VitePress patch release without indicating a real regression.

- [ ] **Step 3: Run the build**

Run: `npm test && npm run build`
Expected: both green. No assertion changes in this task; this confirms nothing regressed.

- [ ] **Step 4: Commit**

```bash
git add .vitepress/theme/theme.css
git commit -m "feat(theme): field-manual footer and search results"
```

---

### Task 7: Sticky code rail on install pages

Stripe's persistent code panel, applied only where it earns its keep. Opt-in by path allowlist in `config.ts` — **not** page frontmatter, because docs content is cloned from the upstream toolkit by `scripts/fetch-toolkit.sh` and assembled unmodified.

**Files:**
- Create: `.vitepress/theme/code-rail.ts` (the allowlist matcher — pure, testable)
- Create: `.vitepress/theme/CodeRail.vue`
- Modify: `.vitepress/config.ts` (`themeConfig.codeRail`)
- Modify: `.vitepress/theme/index.ts` (mount into the `doc-before` slot alongside `PlatformBadge`)
- Test: `.vitepress/theme/code-rail.test.ts` (create)

**Interfaces:**
- Consumes: token scales (Task 1).
- Produces:
  ```ts
  export function railEnabled(path: string, allow: string[]): boolean
  ```

- [ ] **Step 1: Write the failing test**

Create `.vitepress/theme/code-rail.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { railEnabled } from './code-rail'

const ALLOW = ['/introduction', '/workflows/']

describe('railEnabled', () => {
  it('matches an exact page path', () => {
    expect(railEnabled('/introduction', ALLOW)).toBe(true)
    expect(railEnabled('/introduction.html', ALLOW)).toBe(true)
  })

  it('matches any page under a directory entry', () => {
    expect(railEnabled('/workflows/', ALLOW)).toBe(true)
    expect(railEnabled('/workflows/release.html', ALLOW)).toBe(true)
  })

  it('does not match a prefix that is not a path boundary', () => {
    expect(railEnabled('/introduction-notes', ALLOW)).toBe(false)
    expect(railEnabled('/workflows-archive/x.html', ALLOW)).toBe(false)
  })

  it('is off for everything else, and for an empty allowlist', () => {
    expect(railEnabled('/agents/security_expert.html', ALLOW)).toBe(false)
    expect(railEnabled('/introduction', [])).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run .vitepress/theme/code-rail.test.ts`
Expected: FAIL — `Failed to resolve import "./code-rail"`.

- [ ] **Step 3: Implement the matcher**

Create `.vitepress/theme/code-rail.ts`:

```ts
/**
 * Whether the sticky code rail is on for a page.
 *
 * Opt-in is a path allowlist in themeConfig rather than page frontmatter: docs content is
 * cloned from the upstream toolkit by scripts/fetch-toolkit.sh and assembled unmodified,
 * so this site cannot add frontmatter to those pages without diverging from upstream.
 *
 * An entry ending in '/' matches that directory and everything under it. Any other entry
 * matches that page exactly, with or without the '.html' extension. Prefix matching is
 * deliberately boundary-aware so '/introduction' does not also enable '/introduction-notes'.
 */
export function railEnabled(path: string, allow: string[]): boolean {
  const clean = path.replace(/\.html$/, '').replace(/\/index$/, '/')

  return allow.some((entry) => {
    if (entry.endsWith('/')) return clean === entry || clean.startsWith(entry)
    return clean === entry
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run .vitepress/theme/code-rail.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write `CodeRail.vue`**

The rail relocates the page's own `div[class*='language-']` fences into a sticky right-hand column, then restores them if the viewport drops below 1280px. It never creates content — if the page has no fences, or JavaScript is off, nothing happens and the fences stay inline.

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useData, useRoute } from 'vitepress'
import { railEnabled } from './code-rail'

const { theme } = useData()
const route = useRoute()

const rail = ref<HTMLElement | null>(null)
const moved: Array<{ node: Element; placeholder: Comment }> = []

const MIN_WIDTH = 1280

function restore() {
  for (const { node, placeholder } of moved.splice(0)) {
    placeholder.parentNode?.replaceChild(node, placeholder)
  }
}

/**
 * Move each fence out of the prose and into the rail, leaving a comment node behind so
 * the exact original position is recoverable on resize. Cloning instead of moving would
 * duplicate ids and break the copy buttons VitePress attaches to each fence.
 */
function collect() {
  const doc = document.querySelector('.vp-doc')
  if (!doc || !rail.value) return
  for (const node of doc.querySelectorAll("div[class*='language-']")) {
    const placeholder = document.createComment('code-rail')
    node.parentNode?.replaceChild(placeholder, node)
    rail.value.appendChild(node)
    moved.push({ node, placeholder })
  }
}

function sync() {
  restore()
  if (window.innerWidth >= MIN_WIDTH) collect()
}

async function activate() {
  restore()
  if (!railEnabled(route.path, theme.value.codeRail ?? [])) return
  await nextTick()
  sync()
}

onMounted(() => {
  activate()
  window.addEventListener('resize', sync)
})

onUnmounted(() => {
  restore()
  window.removeEventListener('resize', sync)
})
</script>

<template>
  <aside ref="rail" class="code-rail" aria-label="Code for this page" />
</template>

<style scoped>
/* Hidden until it holds something — an empty rail must not reserve a column. */
.code-rail:empty {
  display: none;
}

.code-rail {
  position: sticky;
  top: calc(var(--vp-nav-height) + var(--m-s-4));
  float: right;
  width: 26rem;
  margin-left: var(--m-s-5);
  margin-bottom: var(--m-s-5);
  max-height: calc(100vh - var(--vp-nav-height) - var(--m-s-6));
  overflow-y: auto;
  border: 1px solid var(--m-border);
  border-radius: var(--m-radius);
  background: var(--m-surface);
  padding: var(--m-s-2);
}

.code-rail :deep(div[class*='language-']) {
  margin: var(--m-s-2) 0;
}

@media (max-width: 1279px) {
  .code-rail {
    display: none;
  }
}
</style>
```

- [ ] **Step 6: Configure the allowlist and mount the component**

In `.vitepress/config.ts`, add to `themeConfig` next to `tree`:

```ts
    // Pages that get the sticky code rail. Path allowlist, not frontmatter: docs content
    // is cloned from upstream and assembled unmodified. Start narrow — the rail earns its
    // keep on install/usage prose and gets in the way everywhere else.
    codeRail: ['/introduction'],
```

In `.vitepress/theme/index.ts`, import `CodeRail` and render it in the existing `doc-before` slot beside `PlatformBadge`:

```ts
import CodeRail from './CodeRail.vue'
```

```ts
      'doc-before': () => [h(PlatformBadge), h(CodeRail)],
```

- [ ] **Step 7: Run everything**

Run: `npm test`
Expected: PASS — all suites including `code-rail`.

Run: `npm run build`
Expected: `All build assertions passed.`

- [ ] **Step 8: Verify in a browser**

`npm run dev`, open `/introduction` at a window ≥1280px wide.

- The page's code fences appear in a bordered panel on the right that stays put as you scroll; prose reflows around it.
- VitePress's copy button still works on each relocated fence.
- Narrow the window below 1280px: the fences return **to their original positions**, in order, inline in the prose. Widen again: they move back out.
- Open `/agents/security_expert` at the same width: no rail, fences inline — the allowlist is doing its job.
- Disable JavaScript and reload `/introduction`: fences render inline, nothing missing.
- Both themes.

- [ ] **Step 9: Commit**

```bash
git add .vitepress/theme/code-rail.ts .vitepress/theme/code-rail.test.ts .vitepress/theme/CodeRail.vue .vitepress/config.ts .vitepress/theme/index.ts
git commit -m "feat(docs): sticky code rail on opted-in pages"
```

---

## Final verification

After Task 7, run the spec's full acceptance list once, end to end.

- [ ] `npm test` — every suite green (`render-fixes`, `vpre`, `toolkit-tree`, `tokens`, `fonts`, `hero-data`, `code-rail`).
- [ ] `npm run build` — `All build assertions passed.`, 13 assertion groups.
- [ ] `npm run check:links` — the linkinator crawl passes, including every new link out of the tree panel (`/agents/`, `/skills/`, … ) and the tier anchors (`#tier-01` … `#tier-04`).
- [ ] `grep -rl 'fonts.googleapis\|fonts.gstatic' dist/` returns nothing.
- [ ] **Responsive:** landing and one docs page at 375px, 768px, 1024px, 1440px. No horizontal scroll at any width.
- [ ] **Both themes** at each of those widths.
- [ ] **No JavaScript:** all three hero panels render stacked; code fences render inline on `/introduction`.
- [ ] **Keyboard:** tab into the hero frame's tab bar, arrow between tabs, visible focus ring throughout; tab through the routing diagram's links.
- [ ] **Contrast:** spot-check `--m-text-3` on `--m-surface` in both themes against WCAG AA for the mono label sizes used (the stat line, tree branches, footer meta).
- [ ] **Honesty check:** nothing on the page describes the `SESSION` panel as a recording. It is an authored transcript and `hero-data.ts` says so.

## Known limitations

- **The `SESSION` panel is authored, not recorded.** Replacing it with a real asciinema cast is a follow-up that touches only `hero-data.ts` and the session branch of `HeroFrame.vue`. It must not be described as captured output until it is.
- **Vue components have no unit tests.** The "no new dependencies" constraint rules out `jsdom` and `@vue/test-utils`, so component behaviour is covered by build assertions on rendered HTML plus the manual checklist above. If that trade stops paying, adding a component-test harness is its own scoped change.
