import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  collectPages,
  countInventory,
  buildToolkitTree,
  buildRewrites,
  buildSidebar,
  readTitle,
  fixRootReadmeLinks,
  extractIntroduction,
  splitSections,
  headingSlug,
  TOOLKIT_REPO_URL
} from './toolkit-tree'

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

describe('fixRootReadmeLinks', () => {
  it('rewrites a same-directory link to the root README (root-level linking page)', () => {
    expect(fixRootReadmeLinks('<a href="./README">x</a>')).toBe('<a href="./introduction">x</a>')
  })

  it('rewrites a link from one directory deep, preserving depth', () => {
    expect(fixRootReadmeLinks('<a href="../README">x</a>')).toBe('<a href="../introduction">x</a>')
  })

  it('rewrites a link from two directories deep, preserving depth', () => {
    expect(fixRootReadmeLinks('<a href="../../README">x</a>')).toBe('<a href="../../introduction">x</a>')
  })

  it('leaves links to other READMEs untouched', () => {
    expect(fixRootReadmeLinks('<a href="../agents/README">x</a>')).toBe('<a href="../agents/README">x</a>')
  })

  it('leaves unrelated hrefs untouched', () => {
    expect(fixRootReadmeLinks('<a href="./introduction">x</a>')).toBe('<a href="./introduction">x</a>')
  })

  it('rewrites the bare no-prefix form', () => {
    expect(fixRootReadmeLinks('<a href="README">x</a>')).toBe('<a href="introduction">x</a>')
  })

  it('preserves a trailing anchor', () => {
    expect(fixRootReadmeLinks('<a href="./README#section">x</a>')).toBe('<a href="./introduction#section">x</a>')
  })

  it('preserves a trailing query string', () => {
    expect(fixRootReadmeLinks('<a href="../README?x=1">x</a>')).toBe('<a href="../introduction?x=1">x</a>')
  })

  it('preserves a trailing anchor on the bare no-prefix form', () => {
    expect(fixRootReadmeLinks('<a href="README#top">x</a>')).toBe('<a href="introduction#top">x</a>')
  })
})

describe('extractIntroduction', () => {
  const README = `<div align="center">

# 📱 Mobile Engineering Agents

[![License](x.svg)](LICENSE)

[Docs Site](https://x) · [Quick Start](#quick-start)

</div>

---

## Why this exists

Prose that lives on the landing page.

## Quick Start

\`\`\`bash
## not a heading
\`\`\`

## How to Use the Agents

See [Contributing](#contributing--everyone-is-welcome) and [How It Works](#how-it-works).

### Way 1 — Just describe the task (the default)

<details>
<summary><b>Claude Code</b></summary>

\`\`\`text
> Read agents/security_expert.md
\`\`\`

</details>

<details>
<summary><b>Cursor</b></summary>

Use @workflows.

</details>

---

## How It Works

Four moves.

---

## Example Workflows

\`\`\`mermaid
flowchart LR
    A --> B
\`\`\`

---

## Roadmap

- [ ] later
`

  it('keeps only the usage sections, in order, and drops the GitHub-facing rest', () => {
    const out = extractIntroduction(README)
    expect(out).toContain('## How to Use the Agents')
    expect(out).toContain('## How It Works')
    expect(out).toContain('## Example Workflows')
    expect(out.indexOf('## How to Use')).toBeLessThan(out.indexOf('## How It Works'))
    expect(out.indexOf('## How It Works')).toBeLessThan(out.indexOf('## Example Workflows'))
    expect(out).not.toContain('## Why this exists')
    expect(out).not.toContain('## Quick Start')
    expect(out).not.toContain('## Roadmap')
    expect(out).not.toContain('align="center"')
    expect(out).not.toContain('shields')
  })

  it('opens with the site-owned title and on-ramp', () => {
    const out = extractIntroduction(README)
    expect(out.startsWith('# Using the agents')).toBe(true)
    expect(out).toContain('/agents/code_reviewer')
  })

  it('keeps the mermaid fence so the build assertion still finds a diagram at /introduction', () => {
    expect(extractIntroduction(README)).toContain('```mermaid')
  })

  it('does not treat "## " inside a fence as a section heading', () => {
    const sections = splitSections(README).map((s) => s.title)
    expect(sections).not.toContain('not a heading')
  })

  it('redirects anchors to dropped sections to GitHub and leaves kept anchors alone', () => {
    const out = extractIntroduction(README)
    expect(out).toContain(`](${TOOLKIT_REPO_URL}#contributing--everyone-is-welcome)`)
    expect(out).toContain('](#how-it-works)')
  })

  it('converts a run of per-tool <details> into one ToolTabs with a slot per tool', () => {
    const out = extractIntroduction(README)
    expect(out).not.toContain('<details>')
    expect(out).toContain(`<ToolTabs :tabs='["Claude Code","Cursor"]'>`)
    expect(out).toContain('<template v-slot:tab-0>\n\n```text')
    expect(out).toContain('<template v-slot:tab-1>\n\nUse @workflows.\n\n</template>')
    expect(out.match(/<ToolTabs/g)).toHaveLength(1)
  })

  it('strips the trailing --- rule from each kept section', () => {
    expect(extractIntroduction(README)).not.toMatch(/\n---\n/)
  })
})

describe('headingSlug', () => {
  it('matches GitHub slugs for the README headings that get linked', () => {
    expect(headingSlug('Way 1 — Just describe the task (the default)')).toBe(
      'way-1--just-describe-the-task-the-default'
    )
    expect(headingSlug('Contributing — everyone is welcome')).toBe('contributing--everyone-is-welcome')
    expect(headingSlug('How It Works')).toBe('how-it-works')
  })
})

describe('buildToolkitTree', () => {
  it('returns one row per non-empty section, in SECTION_ORDER', () => {
    const rows = buildToolkitTree(collectPages(root))
    expect(rows.map((r) => r.slug)).toEqual(['agents', 'skills', 'templates', 'examples'])
  })

  it('carries the display label and the section index link', () => {
    const rows = buildToolkitTree(collectPages(root))
    const agents = rows.find((r) => r.slug === 'agents')!
    expect(agents.label).toBe('Agents')
    expect(agents.link).toBe('/agents/')
  })

  it('uses the same counts as countInventory', () => {
    const pages = collectPages(root)
    const counts = countInventory(pages)
    for (const row of buildToolkitTree(pages)) {
      expect(row.count).toBe(counts[row.slug])
    }
  })

  it('omits sections with no content', () => {
    const rows = buildToolkitTree(collectPages(root))
    expect(rows.some((r) => r.count === 0)).toBe(false)
    expect(rows.some((r) => r.slug === 'workflows')).toBe(false)
  })

  it('appends unknown sections alphabetically after SECTION_ORDER, with proper label casing', () => {
    // Create a local fixture with a mix of known and unknown sections
    const localRoot = mkdtempSync(join(tmpdir(), 'toolkit-extras-'))
    try {
      // Helper to write files into this fixture
      const localPut = (rel: string, body = '# Title\n') => {
        const full = join(localRoot, rel)
        mkdirSync(join(full, '..'), { recursive: true })
        writeFileSync(full, body)
      }

      // Known section (in SECTION_ORDER)
      localPut('agents/README.md')
      localPut('agents/expert.md')

      // Unknown sections (not in SECTION_ORDER) with various naming patterns
      localPut('cli-tools/README.md')
      localPut('cli-tools/command.md')
      localPut('design_docs/README.md')
      localPut('design_docs/guide.md')
      localPut('zebra_notes/README.md')
      localPut('zebra_notes/note.md')

      const pages = collectPages(localRoot)
      const rows = buildToolkitTree(pages)

      // Verify structure: known sections come first in SECTION_ORDER order, unknown sections follow alphabetically
      const slugs = rows.map((r) => r.slug)
      expect(slugs).toEqual(['agents', 'cli-tools', 'design_docs', 'zebra_notes'])

      // Verify proper label casing for hyphenated/underscored slugs
      const cliTools = rows.find((r) => r.slug === 'cli-tools')!
      expect(cliTools.label).toBe('Cli Tools')

      const designDocs = rows.find((r) => r.slug === 'design_docs')!
      expect(designDocs.label).toBe('Design Docs')

      const zebraNotes = rows.find((r) => r.slug === 'zebra_notes')!
      expect(zebraNotes.label).toBe('Zebra Notes')

      // Verify links follow the /{slug}/ pattern
      expect(cliTools.link).toBe('/cli-tools/')
      expect(designDocs.link).toBe('/design_docs/')

      // Verify all rows have non-zero counts
      expect(rows.every((r) => r.count > 0)).toBe(true)
    } finally {
      rmSync(localRoot, { recursive: true, force: true })
    }
  })

  it('handles doubled/leading/trailing separators without crashing', () => {
    // Slug with doubled separator: split yields empty strings that must be filtered
    const pages: Page[] = [
      { relPath: 'agents/expert.md', dir: 'agents', base: 'expert', isIndex: false },
      { relPath: 'my--section/guide.md', dir: 'my--section', base: 'guide', isIndex: false }
    ]
    const rows = buildToolkitTree(pages)
    const mySection = rows.find((r) => r.slug === 'my--section')!
    // Split yields ['my', '', 'section'], filter removes empty, map+join produces 'My Section'
    expect(mySection.label).toBe('My Section')
  })

  it('sorts extras alphabetically even when counts object has them unordered (mutation: protects .sort())', () => {
    // Pass pages in deliberately non-alphabetical order: zebra before alpha.
    // countInventory inserts in traversal order, so Object.keys(counts) is ['zebra', 'alpha'].
    // Without .sort(), they'd appear as zebra, alpha; with it, they appear alpha, zebra.
    // This direct-array test bypasses collectPages, which normalizes order.
    const pages: Page[] = [
      { relPath: 'agents/expert.md', dir: 'agents', base: 'expert', isIndex: false },
      { relPath: 'zebra/guide.md', dir: 'zebra', base: 'guide', isIndex: false },
      { relPath: 'alpha/note.md', dir: 'alpha', base: 'note', isIndex: false }
    ]
    const rows = buildToolkitTree(pages)
    const slugs = rows.map((r) => r.slug)
    // agents (from SECTION_ORDER) comes first, then extras sorted alphabetically
    expect(slugs).toEqual(['agents', 'alpha', 'zebra'])
  })
})
