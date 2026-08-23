import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectPages, countInventory, buildRewrites, buildSidebar, readTitle } from './toolkit-tree'

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

describe('countInventory with generated indexes', () => {
  let genRoot: string

  beforeAll(() => {
    genRoot = mkdtempSync(join(tmpdir(), 'toolkit-gen-'))
    const genPut = (rel: string, body = '# Title\n') => {
      const full = join(genRoot, rel)
      mkdirSync(join(full, '..'), { recursive: true })
      writeFileSync(full, body)
    }
    genPut('skills/README.md')
    genPut('skills/ui/ios/uikit_view_layer.md')
    // Simulates a gen-dir-index.ts output: a generated scaffold page, not toolkit content.
    genPut('skills/ui/index.md')
  })

  afterAll(() => rmSync(genRoot, { recursive: true, force: true }))

  it('does not count generated index.md pages toward the section total', () => {
    const counts = countInventory(collectPages(genRoot))
    expect(counts.skills).toBe(1)
  })
})

describe('buildRewrites', () => {
  it('maps directory README.md to index.md at every depth', () => {
    const rw = buildRewrites(collectPages(root))
    expect(rw['agents/README.md']).toBe('agents/index.md')
    expect(rw['templates/ios/swiftui_screen/README.md'])
      .toBe('templates/ios/swiftui_screen/index.md')
    expect(rw['examples/chat_app/README.md']).toBe('examples/chat_app/index.md')
  })

  it('maps the root README.md to introduction.md, freeing / for the landing page', () => {
    const rw = buildRewrites(collectPages(root))
    expect(rw['README.md']).toBe('introduction.md')
  })

  it('does not rewrite non-index pages', () => {
    const rw = buildRewrites(collectPages(root))
    expect(rw).not.toHaveProperty('agents/security_expert.md')
    expect(rw).not.toHaveProperty('AGENTS.md')
  })

  it('produces one entry per README plus none extra', () => {
    const pages = collectPages(root)
    const readmes = pages.filter((p) => p.isIndex).length
    expect(Object.keys(buildRewrites(pages))).toHaveLength(readmes)
  })
})

// Sidebar generation uses its own fixture root (Ruling 3): the shared `root` above is
// asserted against exact counts by the describes preceding it (e.g. counts.agents === 2),
// so adding files to it here would make those tests order-dependent. All fixture files are
// created once in beforeAll, matching the 'countInventory with generated indexes' pattern.
describe('sidebar generation', () => {
  let sbRoot: string

  function sbPut(rel: string, body = '# Title\n') {
    const full = join(sbRoot, rel)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, body)
  }

  beforeAll(() => {
    sbRoot = mkdtempSync(join(tmpdir(), 'toolkit-sidebar-'))
    sbPut('AGENTS.md', '# Orchestration\n')
    sbPut('agents/README.md', '# Agents\n')
    sbPut('agents/security_expert.md', '# Security Expert\n')
    sbPut('agents/no_heading.md', 'no heading here\n')
    sbPut('skills/README.md', '# Skills\n')
    sbPut('skills/ui/index.md', '# UI Skills\n')
    sbPut('skills/ui/page_one.md', '# Page One\n')
    sbPut('skills/ui/page_two.md', '# Page Two\n')
    sbPut('templates/README.md', '# Templates\n')
    sbPut('titled.md', '---\nplatform: ios\n---\n\n# Skill: UIKit View Layer\n\nBody.\n')
    sbPut('untitled.md', 'Just prose, no heading.\n')
  })

  afterAll(() => rmSync(sbRoot, { recursive: true, force: true }))

  describe('readTitle', () => {
    it('returns the first H1, ignoring front-matter', () => {
      expect(readTitle(join(sbRoot, 'titled.md'))).toBe('Skill: UIKit View Layer')
    })

    it('returns null when there is no H1', () => {
      expect(readTitle(join(sbRoot, 'untitled.md'))).toBeNull()
    })
  })

  describe('buildSidebar', () => {
    it('emits one group per section, in SECTION_ORDER', () => {
      const groups = buildSidebar(sbRoot, collectPages(sbRoot))
      const texts = groups.map((g) => g.text)
      expect(texts.indexOf('Agents')).toBeLessThan(texts.indexOf('Skills'))
      expect(texts).toContain('Templates')
    })

    it('links the section index to the directory route', () => {
      const groups = buildSidebar(sbRoot, collectPages(sbRoot))
      const agents = groups.find((g) => g.text === 'Agents')!
      expect(agents.items![0]).toEqual({ text: 'Overview', link: '/agents/' })
    })

    it('uses each page H1 as its label and omits the .md extension from links', () => {
      const groups = buildSidebar(sbRoot, collectPages(sbRoot))
      const agents = groups.find((g) => g.text === 'Agents')!
      expect(agents.items).toContainEqual({
        text: 'Security Expert',
        link: '/agents/security_expert'
      })
    })

    it('falls back to the filename when a page has no H1', () => {
      const groups = buildSidebar(sbRoot, collectPages(sbRoot))
      const agents = groups.find((g) => g.text === 'Agents')!
      expect(agents.items).toContainEqual({
        text: 'no_heading',
        link: '/agents/no_heading'
      })
    })

    it('excludes root-level pages from section groups', () => {
      const groups = buildSidebar(sbRoot, collectPages(sbRoot))
      const links = groups.flatMap((g) => g.items ?? []).map((i) => i.link)
      expect(links).not.toContain('/AGENTS')
    })

    it('nests a subdirectory as a collapsed subgroup keyed by its own index, with no item literally named "index"', () => {
      const groups = buildSidebar(sbRoot, collectPages(sbRoot))
      const skills = groups.find((g) => g.text === 'Skills')!
      const uiGroup = skills.items!.find((i) => i.link === '/skills/ui/')!

      expect(uiGroup).toEqual({
        text: 'UI Skills',
        link: '/skills/ui/',
        collapsed: true,
        items: [
          { text: 'Page One', link: '/skills/ui/page_one' },
          { text: 'Page Two', link: '/skills/ui/page_two' }
        ]
      })

      const allLabels = skills.items!.flatMap((i) => [i.text, ...(i.items ?? []).map((c) => c.text)])
      expect(allLabels).not.toContain('index')
    })
  })
})
