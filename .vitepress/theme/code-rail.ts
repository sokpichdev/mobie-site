/**
 * Whether the sticky code rail is on for a page.
 *
 * Opt-in is a path allowlist in themeConfig rather than page frontmatter: docs content is
 * cloned from the upstream toolkit by scripts/fetch-toolkit.sh and assembled unmodified,
 * so this site cannot add frontmatter to those pages without diverging from upstream.
 *
 * An entry ending in '/' matches that directory and everything under it. Any other entry
 * matches that page exactly, with or without the '.html' extension. Prefix matching is
 * deliberately boundary-aware so '/introduction' does not also enable '/introduction-notes'.
 */
export function railEnabled(path: string, allow: string[]): boolean {
  const clean = path.replace(/\.html$/, '').replace(/\/index$/, '/')

  return allow.some((entry) => {
    if (entry.endsWith('/')) return clean === entry || clean.startsWith(entry)
    return clean === entry
  })
}
