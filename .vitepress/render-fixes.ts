// Render-time repairs to toolkit markdown.
//
// The toolkit README is written for GitHub, and some of what GitHub needs is noise (or
// worse) on the docs site. These fixes cannot live in the source: .content/toolkit is
// re-cloned on every build and the CI content guard forbids committing it here. So they
// run over the rendered HTML, alongside fixRootReadmeLinks in toolkit-tree.ts.
//
// Each function is a pure string transform so it can be unit-tested without a build.

/** Hosts that serve decoration, not content. komarev is a visitor-tracking pixel. */
const BADGE_HOSTS = ['img.shields.io', 'shields.io', 'komarev.com', 'badgen.net']

const HOST_PATTERN = BADGE_HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|')

/** <img> whose src points at a badge host. */
const BADGE_IMG = new RegExp(`<img\\b[^>]*\\bsrc="https?://(?:${HOST_PATTERN})[^"]*"[^>]*>`, 'gi')

/** A link wrapping nothing but a badge image — the whole anchor goes, not just the image. */
const LINKED_BADGE = new RegExp(
  `<a\\b[^>]*>\\s*(?:<img\\b[^>]*\\bsrc="https?://(?:${HOST_PATTERN})[^"]*"[^>]*>\\s*)+</a>`,
  'gi'
)

/** A paragraph left with nothing but whitespace once its badges were removed. */
const EMPTY_PARAGRAPH = /<p>(?:\s|<br\s*\/?>)*<\/p>\s*/gi

/**
 * Strip badge images (and the links that exist only to carry them), then drop any
 * paragraph they leave empty. Paragraphs that still hold real content are kept.
 */
export function stripBadges(html: string): string {
  return html.replace(LINKED_BADGE, '').replace(BADGE_IMG, '').replace(EMPTY_PARAGRAPH, '')
}

const PARAGRAPH = /<p>([\s\S]*?)<\/p>\s*/gi
const ANCHOR = /<a\b[^>]*>[\s\S]*?<\/a>/gi

/**
 * Remove a paragraph that is nothing but a row of links joined by separators — the
 * README's hand-rolled table of contents, which the docs site already renders as the
 * "On this page" outline.
 *
 * Deliberately strict: three or more links, and no text between them beyond separators
 * and whitespace. Two links joined by a dot is a pair of references in prose, not a nav
 * row, and a paragraph with real words survives regardless of how many links it holds.
 */
export function dropNavRow(html: string): string {
  return html.replace(PARAGRAPH, (whole, inner: string) => {
    const links = inner.match(ANCHOR) ?? []
    if (links.length < 3) return whole
    const withoutLinks = inner.replace(ANCHOR, '')
    // Separators only: middot, bullet, pipe, dash, comma, whitespace and <br>.
    const isSeparatorsOnly = /^(?:\s|<br\s*\/?>|[·•|,\-–—])*$/.test(withoutLinks)
    return isSeparatorsOnly ? '' : whole
  })
}

// A leading run of emoji on a heading line: pictographs plus the joiners and selectors
// that compose them (👨‍👩‍👧 is three pictographs and two zero-width joiners).
const HEADING_EMOJI = /^(#{1,6}\s+)(?:[\p{Extended_Pictographic}\u{FE0F}\u{200D}]+\s*)+/u

// ``` or ~~~, three or more, which open and close a fenced block.
const FENCE = /^\s{0,3}(`{3,}|~{3,})/

/**
 * Drop emoji from the front of a markdown heading. The toolkit uses them as GitHub
 * decoration; against the serif display face they read as clutter.
 *
 * This runs on the SOURCE rather than the rendered HTML so that the heading's slug is
 * computed from the cleaned text — otherwise the emoji survives in the id and every
 * anchor link to it (`#%F0%9F%93%B1-mobile-engineering-agents`).
 *
 * Fenced code is skipped: `# 🚀 deploy` inside a shell block is a comment, and rewriting
 * it would corrupt code the reader is meant to copy. Emoji inside heading text are left
 * alone — there they are usually doing real work.
 */
export function stripHeadingEmoji(src: string): string {
  let fence: string | null = null

  return src
    .split('\n')
    .map((line) => {
      const fenceMatch = line.match(FENCE)
      if (fenceMatch) {
        const marker = fenceMatch[1]
        // A fence closes only on the same character, and never on a shorter run.
        if (fence === null) fence = marker
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null
        return line
      }
      if (fence !== null) return line
      return line.replace(HEADING_EMOJI, '$1')
    })
    .join('\n')
}

/**
 * Drop an <hr> that sits directly above an h2. editorial.css already gives every h2 a
 * hairline rule, so the markdown separator and the styled one stack into a double line.
 */
export function collapseHrBeforeHeading(html: string): string {
  return html.replace(/<hr\s*\/?>\s*(?=<h2\b)/gi, '')
}

interface RenderEnv {
  relativePath?: string
  realPath?: string
}

/**
 * Is this the toolkit's root README — the page served at /introduction?
 *
 * Checked two ways because the route is rewritten (README.md → introduction.md) and the
 * source path is the only thing that survives if that mapping ever changes. Section
 * READMEs (agents/README.md → agents/index.md) must NOT match: they are ordinary pages.
 */
export function isRootReadme(env: RenderEnv | undefined): boolean {
  if (!env) return false
  if (env.relativePath === 'introduction.md') return true
  if (env.relativePath && env.relativePath !== 'README.md') return false
  const fromToolkitRoot = (env.realPath ?? '').replace(/.*\/\.content\/toolkit\//, '')
  return fromToolkitRoot === 'README.md'
}
