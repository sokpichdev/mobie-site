import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const THEME = __dirname
const palette = readFileSync(join(THEME, 'palette.css'), 'utf8')
const theme = readFileSync(join(THEME, 'theme.css'), 'utf8')

/** Resolve a token declared as a plain px/rem value to pixels (1rem = 16px). */
function tokenPx(css: string, name: string): number {
  const m = css.match(new RegExp(`${name}:\\s*([\\d.]+)(px|rem)`))
  if (!m) throw new Error(`${name} is not a plain length`)
  return m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1])
}

function rulePx(css: string, selector: string, prop: string): number {
  const block = css.slice(css.indexOf(selector))
  const m = block.slice(0, block.indexOf('}')).match(new RegExp(`${prop}:\\s*([\\d.]+)(px|rem)`))
  if (!m) throw new Error(`${selector} has no plain ${prop}`)
  return m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1])
}

describe('reading sizes', () => {
  it('sets documentation prose at or above the 16px browser default', () => {
    expect(rulePx(theme, '.vp-doc p,', 'font-size')).toBeGreaterThanOrEqual(16)
  })

  it('never makes a heading smaller than the prose it heads', () => {
    const body = rulePx(theme, '.vp-doc p,', 'font-size')
    expect(rulePx(theme, '.vp-doc h4', 'font-size')).toBeGreaterThan(body)
    expect(rulePx(theme, '.vp-doc h3', 'font-size')).toBeGreaterThan(body)
  })

  it('keeps h3 visibly distinct from h4', () => {
    expect(rulePx(theme, '.vp-doc h3', 'font-size'))
      .toBeGreaterThan(rulePx(theme, '.vp-doc h4', 'font-size'))
  })
})

describe('the small end of the ramp', () => {
  it('keeps every utility step at a legible floor', () => {
    // 12px is the practical floor for mono text on a phone; below that the
    // letterforms stop resolving at arm's length.
    for (const token of ['--m-t-fine', '--m-t-micro', '--m-t-small']) {
      expect(tokenPx(palette, token)).toBeGreaterThanOrEqual(12)
    }
    expect(tokenPx(palette, '--m-t-label')).toBeGreaterThanOrEqual(12)
  })

  it('orders the utility steps consistently', () => {
    expect(tokenPx(palette, '--m-t-small')).toBeGreaterThan(tokenPx(palette, '--m-t-micro'))
    expect(tokenPx(palette, '--m-t-micro')).toBeGreaterThan(tokenPx(palette, '--m-t-fine'))
  })
})

/**
 * Every `font-size` declared in theme.css, resolved to pixels.
 *
 * Deliberately loud: a value this can't resolve is thrown on rather than skipped,
 * because a silent skip is exactly how a 10.5px rule would slip back in. The three
 * kinds of value it declines to resolve are each declined for a stated reason, and
 * anything outside those three is a parse failure, not a pass.
 */
function themeFontSizesPx(css: string): Array<{ value: string; px: number }> {
  const declarations = [...css.matchAll(/font-size:\s*([^;]+);/g)].map((m) => m[1].trim())
  if (declarations.length === 0) {
    throw new Error('found no font-size declarations in theme.css — the parser is broken, not the CSS')
  }

  const resolved: Array<{ value: string; px: number }> = []
  for (const raw of declarations) {
    const value = raw.replace(/\s*!important$/, '').trim()

    // Tokens: the utility ramp has its own floor test above, against palette.css,
    // where the actual number lives. Nothing to resolve here.
    if (/^var\(--[\w-]+\)$/.test(value)) continue

    // `em` is relative to the element's own inherited size (0.84em inline code inside
    // 17px prose is ~14px). It cannot be resolved from the stylesheet alone, and the
    // prose floor is asserted separately, so a proportional value is out of scope.
    if (/^[\d.]+em$/.test(value)) continue

    const m = value.match(/^([\d.]+)(px|rem)$/)
    if (!m) throw new Error(`cannot resolve font-size: ${raw} — extend this parser rather than ignoring it`)
    resolved.push({ value, px: m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1]) })
  }

  if (resolved.length === 0) throw new Error('resolved no absolute font-sizes in theme.css')
  return resolved
}

describe('the whole stylesheet', () => {
  it('declares no font-size below the 12px legible floor', () => {
    // The same floor the utility tokens are held to. It used to apply only to the
    // tokens, while theme.css itself carried a set of 10.5px label rules that no
    // test could see.
    const tooSmall = themeFontSizesPx(theme).filter((d) => d.px < 12)
    expect(tooSmall.map((d) => d.value)).toEqual([])
  })
})

describe('mobile', () => {
  it('grows the smallest steps on narrow screens instead of shrinking them', () => {
    // `toContain('--m-t-label:')` passed for any value at all, including a smaller
    // one — which is the single thing this test exists to rule out. Resolve both
    // declarations and compare them.
    const mobileStart = palette.indexOf('@media (max-width: 768px)')
    expect(mobileStart).toBeGreaterThan(-1)
    const mobile = palette.slice(mobileStart)
    const root = palette.slice(palette.indexOf(':root {'), mobileStart)

    for (const token of ['--m-t-label', '--m-t-fine', '--m-t-micro']) {
      expect(tokenPx(mobile, token)).toBeGreaterThan(tokenPx(root, token))
    }
  })

  it('does not shrink body prose on narrow screens', () => {
    expect(theme).not.toMatch(/@media[^{]*max-width[^{]*\{[^}]*\.vp-doc p[^}]*font-size:\s*1[0-5]px/)
  })
})
