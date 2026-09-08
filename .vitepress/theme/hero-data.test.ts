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
