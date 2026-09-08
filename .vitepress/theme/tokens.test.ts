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
