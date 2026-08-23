import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** Directories excluded by name. Dot-prefixed directories are excluded by rule, not by name. */
export const EXCLUDED_DIRS = ['node_modules', 'docs', 'path']

/** Sections whose inventory count is a number of child directories, not of files. */
export const DIR_COUNTED_SECTIONS = ['templates', 'examples']

export type Page = {
  /** POSIX-style path relative to the toolkit root, e.g. "agents/security_expert.md". */
  relPath: string
  /** Containing directory relative to root; "" for root-level files. */
  dir: string
  /** Filename without the .md extension. */
  base: string
  /** True when the file is a directory index (README.md). */
  isIndex: boolean
}

export function collectPages(root: string): Page[] {
  const out: Page[] = []

  function walk(abs: string) {
    for (const entry of readdirSync(abs)) {
      const full = join(abs, entry)
      if (statSync(full).isDirectory()) {
        if (entry.startsWith('.') || EXCLUDED_DIRS.includes(entry)) continue
        walk(full)
        continue
      }
      if (!entry.endsWith('.md')) continue

      const relPath = relative(root, full).split(sep).join('/')
      const slash = relPath.lastIndexOf('/')
      out.push({
        relPath,
        dir: slash === -1 ? '' : relPath.slice(0, slash),
        base: entry.slice(0, -3),
        isIndex: entry === 'README.md'
      })
    }
  }

  walk(root)
  return out.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0))
}

export function countInventory(pages: Page[]): Record<string, number> {
  const counts: Record<string, number> = {}
  const dirSections: Record<string, Set<string>> = {}

  for (const page of pages) {
    if (page.dir === '') continue
    const section = page.dir.split('/')[0]

    if (DIR_COUNTED_SECTIONS.includes(section)) {
      // Count leaf directories that hold a README, e.g. templates/ios/swiftui_screen.
      if (!page.isIndex || page.dir === section) continue
      ;(dirSections[section] ??= new Set()).add(page.dir)
      continue
    }

    // Generated index.md pages (skills/**, templates/ios/) are directory scaffolding,
    // not toolkit content, so they must not inflate file-based section counts.
    if (page.isIndex || page.base === 'index') continue
    counts[section] = (counts[section] ?? 0) + 1
  }

  for (const [section, dirs] of Object.entries(dirSections)) {
    counts[section] = dirs.size
  }

  return counts
}

/** Display order and labels for top-level sections. Anything else is appended alphabetically. */
export const SECTION_ORDER: Array<[string, string]> = [
  ['agents', 'Agents'],
  ['skills', 'Skills'],
  ['workflows', 'Workflows'],
  ['checklists', 'Checklists'],
  ['standards', 'Standards'],
  ['architecture', 'Architecture'],
  ['prompts', 'Prompts'],
  ['templates', 'Templates'],
  ['examples', 'Examples']
]

export type SidebarItem = { text: string; link?: string; items?: SidebarItem[]; collapsed?: boolean }

/** First H1 of a markdown file, with any YAML front-matter block skipped. */
export function readTitle(absPath: string): string | null {
  const raw = readFileSync(absPath, 'utf8')
  const body = raw.startsWith('---') ? raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '') : raw
  const match = body.match(/^#\s+(.+?)\s*$/m)
  return match ? match[1] : null
}

/**
 * Items for one directory: its direct (non-index) pages, followed by one nested,
 * collapsed group per immediate subdirectory that holds markdown. Recurses so multi-level
 * trees (e.g. skills/<topic>/<platform>/*.md) nest correctly. A directory's own
 * README.md / generated index.md never becomes an item — it supplies the parent group's
 * link and label instead (Ruling 10).
 */
function buildDirItems(root: string, prefix: string, pages: Page[]): SidebarItem[] {
  const directPages: Page[] = []
  const childOrder: string[] = []
  const seenChildren = new Set<string>()

  for (const page of pages) {
    if (page.dir === prefix) {
      if (page.isIndex || page.base === 'index') continue
      directPages.push(page)
      continue
    }
    if (page.dir.startsWith(`${prefix}/`)) {
      const childName = page.dir.slice(prefix.length + 1).split('/')[0]
      if (!seenChildren.has(childName)) {
        seenChildren.add(childName)
        childOrder.push(childName)
      }
    }
  }

  const items: SidebarItem[] = directPages.map((page) => ({
    text: readTitle(join(root, page.relPath)) ?? page.base,
    link: `/${page.dir}/${page.base}`
  }))

  for (const childName of childOrder) {
    const childDir = `${prefix}/${childName}`
    const indexPage = pages.find((p) => p.dir === childDir && (p.isIndex || p.base === 'index'))
    const label =
      (indexPage && readTitle(join(root, indexPage.relPath))) ??
      childName[0].toUpperCase() + childName.slice(1)
    const childItems = buildDirItems(root, childDir, pages)

    items.push(
      childItems.length
        ? { text: label, link: `/${childDir}/`, collapsed: true, items: childItems }
        : { text: label, link: `/${childDir}/` }
    )
  }

  return items
}

/**
 * One sidebar group per top-level section, in SECTION_ORDER (unlisted sections are
 * appended alphabetically). Each group nests subdirectories as collapsed subgroups rather
 * than flattening them, so a directory index never shows up as a sidebar item literally
 * called "index" (Ruling 10).
 */
export function buildSidebar(root: string, pages: Page[]): SidebarItem[] {
  const known = SECTION_ORDER.map(([slug]) => slug)
  const present = [...new Set(pages.map((p) => p.dir.split('/')[0]).filter(Boolean))]
  const extras = present.filter((s) => !known.includes(s)).sort()
  const ordered: Array<[string, string]> = [
    ...SECTION_ORDER.filter(([slug]) => present.includes(slug)),
    ...extras.map((s) => [s, s[0].toUpperCase() + s.slice(1)] as [string, string])
  ]

  return ordered.map(([slug, label]) => {
    const sectionPages = pages.filter((p) => p.dir === slug || p.dir.startsWith(`${slug}/`))
    const items: SidebarItem[] = []

    if (sectionPages.some((p) => p.dir === slug && p.isIndex)) {
      items.push({ text: 'Overview', link: `/${slug}/` })
    }

    items.push(...buildDirItems(root, slug, sectionPages))

    return { text: label, items }
  })
}

/**
 * VitePress resolves /dir/ to dir/index.md and does not honour README.md as an index.
 * The toolkit uses README.md as its directory index everywhere, so remap them.
 * The root README.md becomes /introduction because site/index.md owns /.
 */
export function buildRewrites(pages: Page[]): Record<string, string> {
  const rewrites: Record<string, string> = {}

  for (const page of pages) {
    if (!page.isIndex) continue
    rewrites[page.relPath] = page.dir === '' ? 'introduction.md' : `${page.dir}/index.md`
  }

  return rewrites
}
