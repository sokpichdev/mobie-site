import { readdirSync, statSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The toolkit uses README.md as its directory index, but nests topic directories
 * (skills/security/, skills/ui/ios/) that have none — so links to them have no page to
 * resolve to. Generate an index for any directory that has markdown descendants but
 * neither README.md nor index.md.
 *
 * Writes into the gitignored .content/toolkit clone only. The toolkit repo is never touched.
 */

function firstHeading(absPath: string): string | null {
  const raw = readFileSync(absPath, 'utf8')
  const body = raw.startsWith('---') ? raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '') : raw
  const m = body.match(/^#\s+(.+?)\s*$/m)
  return m ? m[1] : null
}

function titleCase(slug: string): string {
  return slug.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function hasMarkdownDescendant(dir: string): boolean {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (hasMarkdownDescendant(full)) return true
    } else if (entry.endsWith('.md')) {
      return true
    }
  }
  return false
}

/** Returns the relative paths of the index files it created. */
export function generateDirIndexes(root: string, skipDirs: string[] = []): string[] {
  const created: string[] = []

  function walk(abs: string, rel: string) {
    const entries = readdirSync(abs)
    const dirs = entries.filter((e) => !e.startsWith('.') && statSync(join(abs, e)).isDirectory())
    const files = entries.filter((e) => e.endsWith('.md')).sort()

    if (rel !== '' && !skipDirs.includes(rel.split('/')[0])) {
      const hasIndex = existsSync(join(abs, 'README.md')) || existsSync(join(abs, 'index.md'))
      if (!hasIndex && hasMarkdownDescendant(abs)) {
        const name = rel.split('/').pop()!
        const lines = [`# ${titleCase(name)}`, '']

        const pages = files.filter((f) => f !== 'README.md' && f !== 'index.md')
        if (pages.length) {
          for (const f of pages) {
            const title = firstHeading(join(abs, f)) ?? f.slice(0, -3)
            lines.push(`- [${title}](./${f.slice(0, -3)})`)
          }
          lines.push('')
        }

        const subdirs = dirs.filter((d) => hasMarkdownDescendant(join(abs, d))).sort()
        if (subdirs.length) {
          if (pages.length) lines.push('## Subsections', '')
          for (const d of subdirs) lines.push(`- [${titleCase(d)}](./${d}/)`)
          lines.push('')
        }

        writeFileSync(join(abs, 'index.md'), lines.join('\n'))
        created.push(`${rel}/index.md`)
      }
    }

    for (const d of dirs) walk(join(abs, d), rel === '' ? d : `${rel}/${d}`)
  }

  walk(root, '')
  return created
}
