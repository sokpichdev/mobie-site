import { readdirSync, statSync } from 'node:fs'
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
