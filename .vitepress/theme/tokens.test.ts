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

/**
 * Extracts the body of a `<selector> { ... }` rule as the exact text between its
 * braces. Assumes the rule has no nested braces (true of every block this file
 * checks) — the first `}` after the opening brace is the rule's own close.
 * `fromIndex` disambiguates repeated selectors (palette.css has two `:root` rules).
 */
function extractBlock(src: string, selector: string, fromIndex = 0): string {
  const selectorIndex = src.indexOf(selector, fromIndex)
  if (selectorIndex === -1) throw new Error(`selector not found: ${selector}`)
  const braceOpen = src.indexOf('{', selectorIndex)
  const braceClose = src.indexOf('}', braceOpen)
  return src.slice(braceOpen + 1, braceClose).trim()
}

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

  /**
   * palette.css is edited by six later tasks. --m-bg / --m-accent above are a cheap
   * sanity check, but they only spot-check two of the tokens declared under
   * `html.dark`, and say nothing about the --vp-* chrome mapping. Both blocks are a
   * closed set — VitePress's default theme (nav, sidebar, search, code blocks) reads
   * every --vp-* token by name, and the dark palette is meant to invert the light one
   * exactly — so nothing should add, remove, or change a declaration inside either
   * one without a deliberate edit here.
   *
   * A task that deliberately changes a colour updates the matching EXPECTED_*
   * constant below, in this one place, alongside the CSS change.
   */
  const EXPECTED_DARK_BLOCK = `
  --m-bg: #151412;
  --m-bg-alt: #1a1916;
  --m-surface: #1c1b18;
  --m-elevated: #242320;

  --m-border: #2c2a25;
  --m-border-strong: #3c3932;

  --m-text: #ece8df;
  --m-text-2: #a8a295;
  --m-text-3: #736e63;

  --m-accent: #d9704f;
  --m-accent-hi: #e68a6c;
  --m-accent-lo: #c25c3d;
  --m-accent-wash: rgba(217, 112, 79, 0.11);
  --m-accent-line: rgba(217, 112, 79, 0.34);

  --m-positive: #5fbf7a;
  --m-negative: #e5645a;
`.trim()

  const EXPECTED_VP_MAPPING_BLOCK = `
  --vp-c-bg: var(--m-bg);
  --vp-c-bg-alt: var(--m-bg-alt);
  --vp-c-bg-soft: var(--m-surface);
  --vp-c-bg-elv: var(--m-elevated);

  --vp-c-text-1: var(--m-text);
  --vp-c-text-2: var(--m-text-2);
  --vp-c-text-3: var(--m-text-3);

  --vp-c-divider: var(--m-border);
  --vp-c-border: var(--m-border);
  --vp-c-gutter: var(--m-border);

  --vp-c-brand-1: var(--m-accent);
  --vp-c-brand-2: var(--m-accent-hi);
  --vp-c-brand-3: var(--m-accent-lo);
  --vp-c-brand-soft: var(--m-accent-wash);

  --vp-c-default-soft: var(--m-surface);
  --vp-c-tip-1: var(--m-accent);
  --vp-c-tip-soft: var(--m-accent-wash);

  --vp-font-family-base: var(--m-font);
  --vp-font-family-mono: var(--m-font-mono);

  /* Code blocks share the surface colour so fences read as part of the page. */
  --vp-code-block-bg: var(--m-surface);
  --vp-code-block-divider-color: var(--m-border);
  --vp-code-line-highlight-color: var(--m-accent-wash);

  --vp-button-brand-bg: var(--m-accent);
  --vp-button-brand-hover-bg: var(--m-accent-hi);
  --vp-button-brand-border: transparent;
  --vp-button-brand-text: #ffffff;

  --vp-nav-height: 60px;
  --vp-layout-max-width: 1500px;
  --vp-sidebar-width: 268px;
`.trim()

  it('keeps the html.dark block byte-identical', () => {
    expect(extractBlock(palette, 'html.dark {')).toBe(EXPECTED_DARK_BLOCK)
  })

  it('keeps the --vp-* chrome mapping block byte-identical', () => {
    const mappingComment = palette.indexOf('VitePress token mapping')
    expect(extractBlock(palette, ':root {', mappingComment)).toBe(EXPECTED_VP_MAPPING_BLOCK)
  })
})

/**
 * Finds every literal (non-token) sizing length in an SFC's <style> block(s).
 * `extraAllowed` is a narrow, per-file escape hatch for values that are legitimately
 * literal — a one-off reading size picked to fit a specific component, not a ramp
 * step — so a token doesn't get invented solely to make this check pass. It is
 * matched as an exact string, so it can't accidentally widen ALLOWED for anyone else.
 */
function literalSizingOffenders(sfcPath: string, extraAllowed: string[] = []): string[] {
  const css = styleBlock(sfcPath)
  const offenders: string[] = []

  for (const line of css.split('\n')) {
    const m = line.match(/^\s*([a-z-]+)\s*:\s*([^;]+);/)
    if (!m) continue
    const [, prop, rawValue] = m
    if (!SIZING_PROPS.includes(prop)) continue
    for (const part of rawValue.trim().split(/\s+(?![^(]*\))/)) {
      const value = part.trim()
      if (ALLOWED.test(value) || extraAllowed.includes(value)) continue
      offenders.push(`${prop}: ${value}`)
    }
  }

  return offenders
}

describe('Landing.vue uses the scales', () => {
  it('has no literal sizing lengths', () => {
    expect(literalSizingOffenders(join(THEME, 'Landing.vue'))).toEqual([])
  })
})

/**
 * Extended per the Task 8 controller addition: a review found TierRoute.vue
 * hardcoding 0.72rem where --m-t-fine held exactly that value, and this guard
 * couldn't see it because it only ever scanned Landing.vue. HeroFrame.vue and
 * TierRoute.vue are covered now that Task 8 is normalising both files' sizes
 * anyway. CodeRail.vue is included too — it already has no literal sizing
 * lengths, so covering it costs nothing and guards it against regressing.
 */
describe('HeroFrame.vue uses the scales', () => {
  it('has no literal sizing lengths', () => {
    // HeroFrame's proof panels (tree / session transcript / before-after contrast)
    // are read at custom mono sizes chosen to fit the frame's fixed min-height
    // without reflowing the panels — 0.86rem and 0.8rem sit deliberately between
    // --m-t-micro (0.84rem) and --m-t-fine (0.78rem)/--m-t-small (0.95rem) rather
    // than aligning to a ramp step. Inventing a token for a single component's
    // one-off size would exist only to satisfy this test, which the brief
    // explicitly rules out — so these two exact values are allowed here, and
    // only here.
    expect(literalSizingOffenders(join(THEME, 'HeroFrame.vue'), ['0.86rem', '0.8rem'])).toEqual([])
  })
})

describe('TierRoute.vue uses the scales', () => {
  it('has no literal sizing lengths', () => {
    expect(literalSizingOffenders(join(THEME, 'TierRoute.vue'))).toEqual([])
  })
})

describe('CodeRail.vue uses the scales', () => {
  it('has no literal sizing lengths', () => {
    expect(literalSizingOffenders(join(THEME, 'CodeRail.vue'))).toEqual([])
  })
})
