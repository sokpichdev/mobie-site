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
