// Post-build assertions: does dist/ faithfully represent the fetched toolkit?
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { collectPages, countInventory, buildToolkitTree } from '../.vitepress/toolkit-tree'
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
  // '<svg' — only the unrendered `<div class="mermaid">` placeholder (compiled) or a
  // literal, uncompiled `<Mermaid ...>` tag (v-pre'd). Asserting on '<svg' would make this
  // branch permanently, accidentally true-by-omission (it never runs).
  //
  // `class="mermaid"` alone is NOT sufficient: when a page is wrapped in v-pre (see
  // assertion 8), Vue never compiles the <Mermaid> component into that div — it emits the
  // component tag as literal static markup instead, and `<Mermaid class="mermaid" ...>`
  // still contains the substring `class="mermaid"`. That is precisely the failure mode
  // this assertion exists to catch, so checking the substring alone lets a blank, inert
  // diagram pass. A literal, uncompiled `<Mermaid` tag surviving into the HTML is the
  // discriminator: it appears only when the component never mounted.
  const hasMermaidClass = html.includes('class="mermaid"')
  const isUncompiled = html.includes('<Mermaid')
  check(
    `mermaid rendered in ${page.relPath}`,
    hasMermaidClass && !isUncompiled,
    isUncompiled
      ? 'mermaid tag present but uncompiled — the page is v-pre wrapped and the diagram will render blank'
      : 'diagram stayed a code block'
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

// 9. No page in the built output reaches out to Google Fonts. Self-hosting is only
//    real if nothing re-introduces the CDN — a stray <link> in a future head entry or
//    an @import inside a component's <style> would silently undo it, and the browser
//    would still render correctly, so nothing else would catch it.
//    Named for what it collects: HTML *and* CSS, because an @import inside a component's
//    <style> leaks into the emitted stylesheet, never into the markup.
const textAssets: string[] = []
function collectTextAssets(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) collectTextAssets(full)
    else if (entry.endsWith('.html') || entry.endsWith('.css')) textAssets.push(full)
  }
}
collectTextAssets(DIST)
const cdnLeaks = textAssets.filter((f) => {
  const body = readFileSync(f, 'utf8')
  return body.includes('fonts.googleapis.com') || body.includes('fonts.gstatic.com')
})
check(
  `no Google Fonts requests in ${textAssets.length} built files`,
  cdnLeaks.length === 0,
  cdnLeaks.slice(0, 5).join(', ')
)

// 10. The vendored faces actually shipped — by name, not by count. A count alone
//     (`>= 10`) passes a same-count swap and a stale preload href: the @font-face rule
//     or the <link rel=preload> points at a filename that 404s, the browser falls back
//     to a system font or simply wastes the preload, and the page still renders, so
//     nothing else notices. Cross-check the exact filenames the CSS and the config ask
//     for against the directory that actually shipped.
const fontDir = join(DIST, 'fonts')
const shippedFonts = existsSync(fontDir) ? readdirSync(fontDir).filter((f) => f.endsWith('.woff2')) : []
check(`vendored fonts in dist: ${shippedFonts.length}`, shippedFonts.length >= 10)

const paletteCss = readFileSync('.vitepress/theme/palette.css', 'utf8')
const configSrc = readFileSync('.vitepress/config.ts', 'utf8')
const facesInCss = [...paletteCss.matchAll(/url\('\/fonts\/([^']+)'\)/g)].map((m) => m[1])
const facesPreloaded = [...configSrc.matchAll(/href: '\/fonts\/([^']+)'/g)].map((m) => m[1])
// A regex that silently matches nothing would make every check below vacuously true.
check(`palette.css references font files: ${facesInCss.length}`, facesInCss.length > 0)
check(`config.ts preloads font files: ${facesPreloaded.length}`, facesPreloaded.length > 0)
for (const face of [...new Set([...facesInCss, ...facesPreloaded])]) {
  check(`referenced font shipped: ${face}`, shippedFonts.includes(face))
}

// 11. The hero's three proof panels reached the built HTML. What makes them render
//     server-side is that HeroFrame's `interactive` flag starts `false` and is only
//     flipped on mount — under `v-if` and `interactive === false` the panels would render
//     server-side too, so `v-show` is not the reason and never was. `v-show` governs the
//     *hydrated* behaviour (the panels stay in the DOM and are toggled by display), which
//     is why a reader without JavaScript keeps all three. Asserting on the markup is
//     therefore also the no-JS regression test.
//
//     Each needle must be unique to the hero frame, or a broken/unregistered HeroFrame
//     could still pass this check on unrelated markup elsewhere on the page. The session
//     needle in particular is NOT 'Mobile Engineering Agents — loaded ✓' by itself — that
//     exact string also appears in the Install section's <code> confirmation line
//     (Landing.vue's .confirm paragraph), which this task never touched, so a plain
//     substring check would pass even with an empty SESSION_TRANSCRIPT. Anchoring on the
//     session--ok class, which only the transcript's final line carries, closes that gap.
const heroChecks: Array<[string, boolean]> = [
  ['tree panel', index.includes('tree__root')],
  ['session panel', /class="session--ok"[^>]*>Mobile Engineering Agents — loaded ✓/.test(index)],
  ['before/after panel', index.includes('contrast__note')],
  ['stat line', index.includes('hero__stats')]
]
for (const [label, ok] of heroChecks) {
  check(`hero ${label} rendered`, ok)
}

// 12. The tree panel's counts match the derived counts, in order — the same guarantee
//     assertion 5 gives the inventory grid. A tree that drifts from the real toolkit is
//     worse than no tree, because it is proof that lies.
const treeRendered = [...index.matchAll(/tree__count[^>]*>(\d+)/g)].map((m) => Number(m[1]))
const treeExpected = buildToolkitTree(pages).map((r) => r.count)
check(
  `hero tree counts match derived: [${treeRendered}] vs [${treeExpected}]`,
  JSON.stringify(treeRendered) === JSON.stringify(treeExpected)
)

// 13. The landing page's chapters are numbered 01–05 with no gaps. Sections were merged
//     and removed in this pass; a stale eyebrow is invisible in review but obvious to a
//     reader, and nothing else in the build would catch it.
const eyebrows = [...index.matchAll(/eyebrow[^>]*>\s*(\d{2})\s*—/g)].map((m) => m[1])
check(
  `landing chapters numbered sequentially: [${eyebrows}]`,
  JSON.stringify(eyebrows) === JSON.stringify(['01', '02', '03', '04', '05'])
)



console.log('')
if (failures.length) {
  console.error(`${failures.length} assertion(s) failed.\n`)
  process.exit(1)
}
console.log('All build assertions passed.\n')
