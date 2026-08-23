import type MarkdownIt from 'markdown-it'

/**
 * VitePress compiles every page as a Vue SFC, so literal {{...}} in prose — which the
 * toolkit's prompts/*.md use as fill-in placeholders — crashes the template compiler.
 *
 * Wrap ONLY the pages that contain such placeholders. A blanket wrap would also disable
 * Vue on pages that need it: vitepress-plugin-mermaid emits a <Mermaid> component, and
 * v-pre would stop it mounting, silently rendering no diagram at all.
 *
 * index.md is exempt regardless — it hosts <Landing />.
 *
 * Fenced code blocks are already v-pre'd by VitePress, so they are stripped before testing.
 */
export function vPreExceptLanding(md: MarkdownIt): void {
  const render = md.render.bind(md)

  md.render = (src: string, env?: any): string => {
    const html = render(src, env)
    if (env?.relativePath === 'index.md') return html
    if (!needsVPre(src)) return html
    return `<div v-pre>\n${html}\n</div>`
  }
}

/** True when the source has {{ outside a fenced code block. Exported for testing. */
export function needsVPre(src: string): boolean {
  return /\{\{/.test(src.replace(/```[\s\S]*?```/g, ''))
}
