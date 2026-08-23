// Post-build assertions: does dist/ faithfully represent the fetched toolkit?
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { collectPages, countInventory } from '../.vitepress/toolkit-tree'
import { needsVPre } from '../.vitepress/vpre'

const SRC = '.content/toolkit'
const DIST = 'dist'
const failures: string[] = []

function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    console.log(`  ok    ${label}`)
  } else {
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
    failures.push(label)
  }
}

function countHtml(dir: string): number {
  let n = 0
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'assets') continue
      n += countHtml(full)
    } else if (entry.endsWith('.html')) {
      n += 1
    }
  }
  return n
}

console.log('\nBuild assertions\n')

// 1. Every eligible source page produced an HTML file.
const pages = collectPages(SRC)
const htmlCount = countHtml(DIST)
check(
  `page count: ${htmlCount} html vs ${pages.length} markdown`,
  htmlCount >= pages.length,
  `a shortfall means srcExclude dropped pages`
)

// 2. Every top-level section has a directory index (the README rewrite worked).
for (const section of Object.keys(countInventory(pages))) {
  check(`section index /${section}/`, existsSync(join(DIST, section, 'index.html')))
}

// 3. The root README landed at /introduction, not /.
check('root README rewritten to /introduction', existsSync(join(DIST, 'introduction.html')))

// 4. The landing page is ours, not the toolkit README.
const index = existsSync(join(DIST, 'index.html')) ? readFileSync(join(DIST, 'index.html'), 'utf8') : ''
check('landing page rendered', index.includes('inventory__count'))

// 5. Inventory counts on the landing page match the derived counts.
//    Vue's scoped-styles compiler injects a data-v-<hash> attribute between the class
//    and the closing '>' (e.g. `<span class="inventory__count" data-v-3d04eec7>15</span>`),
//    so a regex anchored on `inventory__count">` never matches rendered output. Allow any
//    attributes between the class and '>'.
const derived = countInventory(pages)
const rendered = [...index.matchAll(/inventory__count[^>]*>(\d+)/g)].map((m) => Number(m[1]))
const expected = ['agents', 'skills', 'workflows', 'checklists', 'standards', 'architecture', 'prompts', 'templates', 'examples']
  .filter((s) => derived[s] > 0)
  .map((s) => derived[s])
check(
  `landing counts match derived: [${rendered}] vs [${expected}]`,
  JSON.stringify(rendered) === JSON.stringify(expected)
)

// 6. Every source file with a mermaid fence rendered a diagram, not a code block.
//    The spec requires all of them, not a representative sample — a plugin regression
//    that only affected nested pages would slip past a single spot-check.
const mermaidSources = pages.filter((page) =>
  readFileSync(join(SRC, page.relPath), 'utf8').includes('```mermaid')
)
check(`mermaid source files found: ${mermaidSources.length}`, mermaidSources.length > 0)

for (const page of mermaidSources) {
  // Mirror buildRewrites (.vitepress/toolkit-tree.ts): every README.md becomes that
  // directory's index.html, EXCEPT the root README, which is rewritten to introduction.html
  // because site/index.md owns '/'. Without this special case the root README's route was
  // miscomputed as index.html — a real page (the toolkit's mermaid diagram in README.md,
  // correctly rendered at /introduction) reported as a false FAIL.
  const route = page.isIndex
    ? page.dir === ''
      ? 'introduction.html'
      : join(page.dir, 'index.html')
    : join(page.dir, `${page.base}.html`)
  const html = existsSync(join(DIST, route)) ? readFileSync(join(DIST, route), 'utf8') : ''
  // vitepress-plugin-mermaid renders the diagram client-side (browser JS turns the
  // placeholder into an <svg> after hydration), so static build output can NEVER contain
  // '<svg' — only the unrendered `<div class="mermaid">` placeholder. Asserting on '<svg'
  // would make this branch permanently, accidentally true-by-omission (it never runs),
  // so we deliberately assert on the placeholder class instead, which is the only thing
  // the static HTML can actually prove: that the page reached the Mermaid component
  // rather than falling back to a plain <pre><code> block (which happens when v-pre wraps
  // the page — see assertion 8 below).
  check(
    `mermaid rendered in ${page.relPath}`,
    html.includes('class="mermaid'),
    'diagram stayed a code block'
  )
}

// 7. The CNAME survived the build.
const cname = existsSync(join(DIST, 'CNAME')) ? readFileSync(join(DIST, 'CNAME'), 'utf8').trim() : ''
check(`CNAME is mobie.sokpich.dev`, cname === 'mobie.sokpich.dev', `got "${cname}"`)

// 8. No source page both needs v-pre (for a literal {{ placeholder) and contains a mermaid
//    fence. vPreExceptLanding (.vitepress/vpre.ts) wraps v-pre pages in <div v-pre> so the
//    Vue template compiler doesn't choke on {{...}} in prose — but v-pre also stops Vue
//    from mounting the <Mermaid> component that vitepress-plugin-mermaid emits, so a page
//    hit by both would render nothing for its diagram, silently (no error, no FAIL from
//    assertion 6, since a v-pre'd mermaid fence renders as an empty div with no code block
//    to visibly "stay" as either). Today this set is empty (0 pages need both), but
//    scripts/fetch-toolkit.sh re-clones the toolkit's main branch on every build, so the
//    moment someone adds a mermaid diagram to a page that also uses {{ placeholders — most
//    likely a prompts/*.md file — this bug returns with the build staying green.
const vPreMermaidCollisions = pages.filter((page) => {
  if (page.relPath === 'index.md') return false // index.md is exempt from v-pre (hosts <Landing />)
  const src = readFileSync(join(SRC, page.relPath), 'utf8')
  return needsVPre(src) && src.includes('```mermaid')
})
check(
  `no page needs both v-pre and mermaid (${pages.length} pages checked)`,
  vPreMermaidCollisions.length === 0,
  vPreMermaidCollisions.length
    ? `would be v-pre wrapped, so its mermaid diagram would render blank: ${vPreMermaidCollisions.map((p) => p.relPath).join(', ')}`
    : ''
)

console.log('')
if (failures.length) {
  console.error(`${failures.length} assertion(s) failed.\n`)
  process.exit(1)
}
console.log('All build assertions passed.\n')
