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

describe('mobile', () => {
  it('grows the smallest steps on narrow screens instead of shrinking them', () => {
    const mobile = palette.slice(palette.indexOf('@media (max-width: 768px)'))
    expect(mobile).toContain('--m-t-label:')
    expect(mobile).toContain('--m-t-fine:')
  })

  it('does not shrink body prose on narrow screens', () => {
    expect(theme).not.toMatch(/@media[^{]*max-width[^{]*\{[^}]*\.vp-doc p[^}]*font-size:\s*1[0-5]px/)
  })
})
