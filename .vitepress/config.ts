import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { vPreExceptLanding } from './vpre'
import { collectPages, buildRewrites, buildSidebar, countInventory, fixRootReadmeLinks } from './toolkit-tree'
import {
  stripBadges,
  dropNavRow,
  stripHeadingEmoji,
  collapseHrBeforeHeading,
  isRootReadme
} from './render-fixes'
import type MarkdownIt from 'markdown-it'

const SRC = './.content/toolkit'
const pages = collectPages(SRC)

// The deploy domain lives in exactly one place — site/public/CNAME, which GitHub Pages
// reads verbatim. Derive the canonical origin from it so absolute URLs (og:url, sitemap)
// can never drift from where the site actually lives.
const ORIGIN = `https://${readFileSync('./site/public/CNAME', 'utf8').trim()}`

const TITLE = 'Mobile Engineering Agents'
const DESCRIPTION = 'Turn your AI coding agent into a Senior mobile engineer.'
const SOCIAL_DESCRIPTION =
  'Architecture, security, testing and standards — so the code your agent generates is production-grade, not just plausible.'

// Mermaid renders its own palette inside our container, so a stock theme clashes with the
// page in at least one mode. vitepress-plugin-mermaid hard-forces `theme: 'dark'` whenever
// <html> carries .dark, which no static `theme`/`themeVariables` can survive — so the
// palette is applied as themeCSS instead. That lands in the SVG's own <style>, where CSS
// custom properties still resolve from the document, so one rule set tracks both modes.
const MERMAID_THEME_CSS = `
  .node rect, .node circle, .node ellipse, .node polygon, .node path,
  .statediagram-state rect, .labelBox, .note, rect.actor {
    fill: var(--mobie-surface) !important;
    stroke: var(--mobie-rule) !important;
  }
  .cluster rect, .statediagram-cluster rect {
    fill: var(--vp-c-bg-alt) !important;
    stroke: var(--mobie-rule) !important;
  }
  .nodeLabel, .edgeLabel, .label, .cluster-label, .titleText, .messageText,
  .loopText, .loopText tspan, .noteText, .noteText tspan, .labelText, .labelText tspan,
  text.actor tspan, .stateLabel, .statediagram-state text {
    fill: var(--mobie-text) !important;
    color: var(--mobie-text) !important;
    font-family: var(--mobie-font-body) !important;
  }
  /* Edge labels are chips punched through the link they sit on. Mermaid paints the chip
     on several nested elements (.edgeLabel, its <p>, and .labelBkg), so all of them have
     to be repainted or a grey slab shows through. */
  .edgeLabel, .edgeLabel p, .edgeLabel span, .labelBkg {
    background-color: var(--mobie-surface) !important;
    color: var(--mobie-text) !important;
  }
  .edgeLabel rect {
    fill: var(--mobie-surface) !important;
  }
  /* Subgraph titles carry their own hard-coded colour, on the label's inner span. */
  .cluster-label text, .cluster-label span, .cluster-label p, .cluster text, .cluster span {
    fill: var(--mobie-text) !important;
    color: var(--mobie-text) !important;
    background-color: transparent !important;
  }
  .edgePath .path, .flowchart-link, .transition, .messageLine0, .messageLine1,
  .loopLine, .actor-line, .relation {
    stroke: var(--mobie-muted) !important;
  }
  marker path, .arrowheadPath, .marker, .marker path {
    fill: var(--mobie-muted) !important;
    stroke: var(--mobie-muted) !important;
  }
  /* State start/end terminals are the one place the accent earns its keep. */
  .statediagram-state .start-state, .node circle.state-start, [class*='state-start'] {
    fill: var(--mobie-accent) !important;
    stroke: var(--mobie-accent) !important;
  }
`

export default withMermaid(defineConfig({
  title: TITLE,
  description: DESCRIPTION,
  srcDir: SRC,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    // .ico fallback for browsers (and crawlers) that ignore the SVG icon.
    ['link', { rel: 'alternate icon', type: 'image/x-icon', href: '/favicon.ico' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    // Two theme-colors so the mobile browser chrome tracks the palette in both modes.
    ['meta', { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#faf8f4' }],
    ['meta', { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#141114' }],
    // Invariant social tags only. The per-page ones are emitted by transformHead below —
    // `head` is static for the whole site and transformHead can only append, so putting
    // og:title here as well would ship two of them on every page.
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: TITLE }],
    ['meta', { property: 'og:image', content: `${ORIGIN}/og.png` }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: `${TITLE} — ${DESCRIPTION}` }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${ORIGIN}/og.png` }]
  ],
  sitemap: { hostname: ORIGIN },
  transformHead({ pageData }) {
    // relativePath is the *rewritten* route source, so it already matches the emitted
    // route (agents/README.md → agents/index.md). cleanUrls drops the extension.
    const route = pageData.relativePath
      .replace(/(^|\/)index\.md$/, '$1')
      .replace(/\.md$/, '')
    const url = `${ORIGIN}/${route}`
    const isHome = route === ''
    const title = isHome ? `${TITLE} — ${DESCRIPTION}` : `${pageData.title} — ${TITLE}`
    const description = isHome
      ? SOCIAL_DESCRIPTION
      : pageData.description || pageData.frontmatter.description || SOCIAL_DESCRIPTION

    return [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }]
    ]
  },
  srcExclude: [
    'node_modules/**',
    'docs/**',
    '.github/**',
    '.superpowers/**',
    'path/**',
    'CODEOWNERS'
  ],
  rewrites: buildRewrites(pages),
  // Default outDir resolves to .vitepress/dist; this repo's contract (and Step 11's
  // route-count check) expects top-level dist/, so pin it explicitly.
  outDir: 'dist',
  cleanUrls: true,
  // `vitepress dev` renders a blank page without this. vitepress-plugin-mermaid registers
  // <Mermaid> on VitePress's client app entry, so mermaid is imported eagerly on every
  // route — and mermaid imports fastdom, which ships CJS only. Vite's dep optimizer is
  // never told about it (the plugin pre-bundles dayjs/debug/cytoscape but not fastdom), so
  // dev serves the raw CJS file, `import fastdom from 'fastdom'` finds no default export,
  // and the module error takes the whole app down before it mounts. Both entry points
  // mermaid imports have to be listed. Production builds were never affected — Rollup
  // handles the CJS interop itself — so this only ever showed up in dev.
  vite: {
    optimizeDeps: {
      include: ['fastdom', 'fastdom/extensions/fastdom-promised.js']
    }
  },
  // Page dates come from `git log -1` on the source file inside .content/toolkit — see
  // scripts/fetch-toolkit.sh, which clones full (blobless) history so these are real.
  // Generated index pages are untracked there, so they simply carry no date.
  lastUpdated: true,
  mermaid: {
    theme: 'base',
    fontFamily: 'var(--mobie-font-body)',
    themeCSS: MERMAID_THEME_CSS
  },
  markdown: {
    config: (md: MarkdownIt) => {
      vPreExceptLanding(md)
      // Post-process rendered HTML. The toolkit is re-cloned on every build and must not
      // be edited here (the CI content guard enforces that), so every repair to its
      // markdown happens at render time. See ./toolkit-tree.ts for fixRootReadmeLinks and
      // ./render-fixes.ts for the rest.
      const render = md.render.bind(md)
      md.render = (src: string, env?: any) => {
        // Heading emoji go before rendering, so the slug — and every anchor built from it
        // — is computed from the cleaned text. The rest operate on the output.
        let html = fixRootReadmeLinks(render(stripHeadingEmoji(src), env))
        // Site-wide: badges are decoration everywhere, and one of them is a third-party
        // visitor-tracking pixel. Doubled rules are likewise cosmetic.
        html = stripBadges(html)
        html = collapseHrBeforeHeading(html)
        // Only the root README carries a hand-rolled table of contents that duplicates the
        // outline sidebar. Elsewhere a row of links may be real content.
        if (isRootReadme(env)) html = dropNavRow(html)
        return html
      }
    }
  },
  // Narrow, never blanket: each pattern covers a target that cannot render as a page.
  // Everything else must resolve, so genuine link rot still fails the build.
  ignoreDeadLinks: [
    /\/LICENSE$/,              // non-markdown file in the toolkit root
    /\/verify\.sh$/,           // non-markdown file in the toolkit root
    /\.swiftlint\.yml$/,       // config file
    /PULL_REQUEST_TEMPLATE/,   // lives under .github/, excluded
    /\/\.claude\//,            // dot-directory, excluded by rule and by VitePress
    /^http:\/\/localhost/      // local dashboard URL in the toolkit README
  ],
  themeConfig: {
    inventory: countInventory(pages),
    nav: [
      { text: 'Introduction', link: '/introduction' },
      {
        text: 'Docs',
        items: [
          { text: 'Agents', link: '/agents/' },
          { text: 'Skills', link: '/skills/' },
          { text: 'Workflows', link: '/workflows/' },
          { text: 'Checklists', link: '/checklists/' },
          { text: 'Standards', link: '/standards/' },
          { text: 'Orchestration', link: '/AGENTS' }
        ]
      }
    ],
    sidebar: buildSidebar(SRC, pages),
    outline: { level: [2, 3], label: 'On this page' },
    lastUpdated: {
      text: 'Updated',
      formatOptions: { dateStyle: 'medium', forceLocale: false }
    },
    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sokpichdev/mobile-engineering-agents' }
    ],
    editLink: {
      pattern: 'https://github.com/sokpichdev/mobile-engineering-agents/edit/main/:path',
      text: 'Edit this page on GitHub'
    },
    footer: {
      message:
        'Released under the <a href="https://github.com/sokpichdev/mobile-engineering-agents/blob/main/LICENSE">MIT License</a>. Content is generated from the <a href="https://github.com/sokpichdev/mobile-engineering-agents">Mobile Engineering Agents</a> toolkit.',
      copyright: `© ${new Date().getFullYear()} Sok Pich`
    }
  }
}))
