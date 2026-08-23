import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectPages, countInventory } from './toolkit-tree'

let root: string

function put(rel: string, body = '# Title\n') {
  const full = join(root, rel)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, body)
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'toolkit-'))
  put('README.md')
  put('AGENTS.md')
  put('agents/README.md')
  put('agents/security_expert.md')
  put('agents/testing_expert.md')
  put('skills/README.md')
  put('skills/ui/ios/uikit_view_layer.md')
  put('templates/README.md')
  put('templates/ios/swiftui_screen/README.md')
  put('templates/ios/uikit_mvp_screen/README.md')
  put('examples/README.md')
  put('examples/chat_app/README.md')
  // excluded
  put('docs/superpowers/plans/old.md')
  put('.github/PULL_REQUEST_TEMPLATE.md')
  put('path/to/stray.md')
  put('node_modules/pkg/readme.md')
  // excluded by dot-prefix rule (Ruling 6)
  put('.claude/agents/security_expert.md')
  put('.hidden/notes.md')
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe('collectPages', () => {
  it('excludes docs/, .github/, path/ and node_modules/', () => {
    const rels = collectPages(root).map((p) => p.relPath)
    expect(rels).not.toContain('docs/superpowers/plans/old.md')
    expect(rels).not.toContain('.github/PULL_REQUEST_TEMPLATE.md')
    expect(rels).not.toContain('path/to/stray.md')
    expect(rels).not.toContain('node_modules/pkg/readme.md')
  })

  it('excludes dot-prefixed directories by rule, not by name (Ruling 6)', () => {
    const rels = collectPages(root).map((p) => p.relPath)
    expect(rels).not.toContain('.claude/agents/security_expert.md')
    expect(rels).not.toContain('.hidden/notes.md')
  })

  it('includes nested markdown at any depth', () => {
    const rels = collectPages(root).map((p) => p.relPath)
    expect(rels).toContain('skills/ui/ios/uikit_view_layer.md')
    expect(rels).toContain('templates/ios/uikit_mvp_screen/README.md')
  })

  it('flags README.md files as directory indexes', () => {
    const pages = collectPages(root)
    const agentsIndex = pages.find((p) => p.relPath === 'agents/README.md')!
    expect(agentsIndex.isIndex).toBe(true)
    expect(agentsIndex.dir).toBe('agents')

    const expert = pages.find((p) => p.relPath === 'agents/security_expert.md')!
    expect(expert.isIndex).toBe(false)
    expect(expert.base).toBe('security_expert')
  })

  it('returns pages sorted by relPath for deterministic output', () => {
    const rels = collectPages(root).map((p) => p.relPath)
    expect(rels).toEqual([...rels].sort())
  })
})

describe('countInventory', () => {
  it('counts non-index markdown files for file-based sections', () => {
    const counts = countInventory(collectPages(root))
    expect(counts.agents).toBe(2)
    expect(counts.skills).toBe(1)
  })

  it('counts child directories for templates and examples', () => {
    const counts = countInventory(collectPages(root))
    expect(counts.templates).toBe(2)
    expect(counts.examples).toBe(1)
  })

  it('omits sections with no entries', () => {
    const counts = countInventory(collectPages(root))
    expect(counts).not.toHaveProperty('workflows')
  })

  it('has no .claude section (Ruling 6: dot-prefixed dirs are never a section)', () => {
    const counts = countInventory(collectPages(root))
    expect(counts).not.toHaveProperty('.claude')
  })
})
