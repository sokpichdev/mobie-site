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

/**
 * `buildRewrites` changes where the root README.md's OUTPUT lands (introduction.html
 * instead of the generic dir/index.html every other README gets, because site/index.md
 * owns '/'), but VitePress does not rewrite the literal href of markdown links elsewhere
 * that point AT it — those still render as a plain relative link to "README", which
 * 404s in the built site (dist has no README.html) even though `vitepress build`'s own
 * dead-link checker resolves it correctly via the rewrites map and reports no problem.
 *
 * Every other README.md keeps the standard README->index mapping, so a relative link to
 * one of those (e.g. "../agents/README.md") already resolves correctly without help; only
 * the root case needs this, because introduction.md is a non-standard destination.
 *
 * Since both README.md and introduction.md live at the toolkit root, a link's leading
 * "../" (or "./") prefix — which encodes how many directories deep the linking page is —
 * is unchanged by the swap; only the final path segment needs rewriting.
 *
 * Handles the no-prefix bare form ("README", same as "./README" from a root-level page),
 * and preserves a trailing anchor ("#section") or query string ("?x=1") if present. None
 * of these forms occur in the toolkit today, but scripts/fetch-toolkit.sh re-clones the
 * toolkit's main branch on every build — the same standing risk that justified the
 * v-pre/mermaid collision check (Ruling 12) — so this closes the gap now rather than
 * waiting to rediscover it.
 */
export function fixRootReadmeLinks(html: string): string {
  return html.replace(
    /href="((?:\.\.\/)+|\.\/)?README(#[^"]*|\?[^"]*)?"/g,
    (_m, prefix, suffix) => `href="${prefix ?? ''}introduction${suffix ?? ''}"`
  )
}

/** GitHub URL of the toolkit — the target for README anchors that the introduction page drops. */
export const TOOLKIT_REPO_URL = 'https://github.com/sokpichdev/mobile-engineering-agents'

/**
 * README sections that make up /introduction, in order. Everything else in the root
 * README either already lives on the landing page (Why / Quick Start / What's Inside /
 * The Agent Team) or is GitHub-facing (badges, contributing, roadmap, license).
 *
 * "Example Workflows" is kept deliberately: it holds the README's mermaid handoff
 * diagram, and scripts/assert-build.ts requires every mermaid source file to render a
 * diagram at its route — dropping the section would fail that assertion.
 */
export const INTRODUCTION_SECTIONS = ['How to Use the Agents', 'How It Works', 'Example Workflows']

/** Site-owned preamble: a title and a three-link on-ramp. Kept short so it cannot drift far. */
const INTRODUCTION_PREAMBLE = `# Using the agents

The landing page gets the toolkit installed. This page is what happens next: how to talk to
it, how it routes your request, and what a real multi-agent handoff looks like.

**Start here**

1. [Install the toolkit](/#install) — three commands, zero file paths.
2. [Your first task](#how-to-use-the-agents) — describe what you want; the entry file does the routing.
3. [The agent you'll meet most](/agents/code_reviewer) — every chain ends at the Code Reviewer.
`

/** GitHub-style heading slug — enough to match the README's own in-page anchors. */
export function headingSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-')
}

/**
 * Split a markdown document on `## ` headings (fenced code is respected: a `## ` inside
 * a fence is not a heading). Returns each section's title and body (heading line included).
 */
export function splitSections(src: string): Array<{ title: string; body: string }> {
  const out: Array<{ title: string; body: string }> = []
  let current: { title: string; body: string } | null = null
  let inFence = false

  for (const line of src.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence
    const m = !inFence && line.match(/^## (.+?)\s*$/)
    if (m) {
      if (current) out.push(current)
      current = { title: m[1], body: '' }
    }
    if (current) current.body += line + '\n'
  }
  if (current) out.push(current)
  return out
}

/**
 * Turn the README's per-tool `<details><summary><b>Tool</b></summary>…</details>` run
 * into one `<ToolTabs>` component with a named slot per tool. Blank lines around the
 * slot tags are load-bearing: markdown-it only parses the body as markdown when the
 * HTML tags sit in their own paragraph. Consecutive details blocks form one tab group.
 */
export function detailsToTabs(md: string): string {
  const one = /<details>\s*<summary>\s*(?:<b>)?([^<]+?)(?:<\/b>)?\s*<\/summary>\s*([\s\S]*?)<\/details>/g
  const run = new RegExp(`(?:${one.source}\\s*)+`, 'g')

  return md.replace(run, (block) => {
    const tabs: Array<{ label: string; body: string }> = []
    for (const m of block.matchAll(one)) tabs.push({ label: m[1].trim(), body: m[2].trim() })
    if (!tabs.length) return block

    const labels = JSON.stringify(tabs.map((t) => t.label))
    const slots = tabs
      .map((t, i) => `<template v-slot:tab-${i}>\n\n${t.body}\n\n</template>`)
      .join('\n\n')
    return `<ToolTabs :tabs='${labels}'>\n\n${slots}\n\n</ToolTabs>\n\n`
  })
}

/**
 * Build the /introduction page from the toolkit's root README.
 *
 * Keeps INTRODUCTION_SECTIONS verbatim (source of truth stays the README), prefixed by a
 * short site-owned on-ramp. In-page anchors pointing at sections that were dropped are
 * redirected to the same anchor on GitHub so no link dead-ends; anchors into kept
 * sections are left alone. `<details>` per-tool blocks become tabs.
 */
export function extractIntroduction(readme: string): string {
  const sections = splitSections(readme)
  const kept = INTRODUCTION_SECTIONS.map((title) => sections.find((s) => s.title === title)).filter(
    (s): s is { title: string; body: string } => Boolean(s)
  )

  const keptAnchors = new Set<string>()
  for (const s of kept) {
    for (const h of s.body.matchAll(/^#{2,6} (.+?)\s*$/gm)) keptAnchors.add(headingSlug(h[1]))
  }

  let body = kept.map((s) => s.body.replace(/\n---\s*$/, '\n')).join('\n')
  body = body.replace(/\]\(#([^)]+)\)/g, (m, anchor) =>
    keptAnchors.has(anchor) ? m : `](${TOOLKIT_REPO_URL}#${anchor})`
  )
  body = detailsToTabs(body)

  return `${INTRODUCTION_PREAMBLE}\n${body}`
}
