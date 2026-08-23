import type MarkdownIt from 'markdown-it'

/**
 * Toolkit markdown is documentation, never live Vue — but VitePress compiles every page
 * as a Vue SFC, so literal {{...}} in prose (prompts/*.md, some templates) crashes the
 * template compiler. Wrap each rendered page body in v-pre to disable interpolation.
 *
 * index.md is exempt: it hosts <Landing />, and v-pre would render the component as
 * literal text instead of mounting it.
 */
export function vPreExceptLanding(md: MarkdownIt): void {
  const render = md.renderer.render.bind(md.renderer)

  md.renderer.render = (tokens, options, env) => {
    const html = render(tokens, options, env)
    if (env?.relativePath === 'index.md') return html
    return `<div v-pre>\n${html}\n</div>`
  }
}
