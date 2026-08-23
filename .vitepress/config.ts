import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { vPreExceptLanding } from './vpre'
import { collectPages, buildRewrites, buildSidebar, countInventory } from './toolkit-tree'

const SRC = './.content/toolkit'
const pages = collectPages(SRC)

export default withMermaid(defineConfig({
  title: 'Mobile Engineering Agents',
  description: 'Turn your AI coding agent into a Senior mobile engineer.',
  srcDir: SRC,
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
  markdown: {
    config: vPreExceptLanding
  },
  // Narrow, never blanket: each pattern covers a target that cannot render as a page.
  // Everything else must resolve, so genuine link rot still fails the build.
  ignoreDeadLinks: [
    /\/LICENSE$/,              // non-markdown file in the toolkit root
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
    }
  }
}))
