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
