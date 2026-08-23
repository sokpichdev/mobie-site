import { describe, it, expect } from 'vitest'
import { needsVPre } from './vpre'

describe('needsVPre', () => {
  it('returns true for prose mustaches', () => {
    const src = 'Integrate the {{REST | GraphQL}} endpoint into the client.'
    expect(needsVPre(src)).toBe(true)
  })

  it('returns false when mustaches only appear inside a fenced code block', () => {
    const src = [
      'Some intro text with no placeholders.',
      '',
      '```swift',
      'struct {{Screen}}View: View {}',
      '```',
      '',
      'More prose after the block.'
    ].join('\n')
    expect(needsVPre(src)).toBe(false)
  })

  it('returns false for a mermaid page with no mustaches', () => {
    const src = [
      '# Architecture',
      '',
      '```mermaid',
      'graph TD',
      '    A --> B',
      '```'
    ].join('\n')
    expect(needsVPre(src)).toBe(false)
  })

  it('returns false for a page with neither mustaches nor fenced code', () => {
    const src = '# Plain page\n\nJust some regular prose, nothing special here.'
    expect(needsVPre(src)).toBe(false)
  })
})
