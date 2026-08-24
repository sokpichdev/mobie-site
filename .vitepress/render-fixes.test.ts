import { describe, it, expect } from 'vitest'
import {
  stripBadges,
  dropNavRow,
  stripHeadingEmoji,
  collapseHrBeforeHeading,
  isRootReadme
} from './render-fixes'

describe('stripBadges', () => {
  it('removes a badge image wrapped in a link, and the paragraph it left empty', () => {
    const html =
      '<p><a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a></p>'
    expect(stripBadges(html)).toBe('')
  })

  it('removes the komarev visitor-tracking pixel, which is a bare img with no link', () => {
    const html = '<p><img alt="" src="https://komarev.com/ghpvc/?username=sokpichdev&color=blueviolet"></p>'
    expect(stripBadges(html)).toBe('')
  })

  it('removes several badges from one paragraph', () => {
    const html =
      '<p><a href="a"><img src="https://img.shields.io/badge/one.svg" alt="one"></a>\n' +
      '<a href="b"><img src="https://img.shields.io/badge/two.svg" alt="two"></a></p>'
    expect(stripBadges(html)).toBe('')
  })

  it('keeps a paragraph that still has real content after its badge is removed', () => {
    const html = '<p>Licensed <img src="https://img.shields.io/badge/x.svg" alt="x"> today</p>'
    const out = stripBadges(html)
    expect(out).toContain('Licensed')
    expect(out).toContain('today')
    expect(out).not.toContain('shields.io')
  })

  it('leaves images that are actual content alone', () => {
    const html = '<p><img src="/diagram.png" alt="architecture"></p>'
    expect(stripBadges(html)).toBe(html)
  })

  it('leaves a link that wraps something other than a badge alone', () => {
    const html = '<p><a href="https://img.shields.io/about">about shields</a></p>'
    expect(stripBadges(html)).toBe(html)
  })
})

describe('dropNavRow', () => {
  it('removes a paragraph that is only links joined by separators', () => {
    const html = '<p><a href="#a">A</a> · <a href="#b">B</a> · <a href="#c">C</a></p>'
    expect(dropNavRow(html)).toBe('')
  })

  it('keeps a paragraph whose links sit in real prose', () => {
    const html = '<p>See <a href="#a">A</a> and <a href="#b">B</a> and also <a href="#c">C</a> for more.</p>'
    expect(dropNavRow(html)).toBe(html)
  })

  it('keeps a short run of links — two is a pair of references, not a nav row', () => {
    const html = '<p><a href="#a">A</a> · <a href="#b">B</a></p>'
    expect(dropNavRow(html)).toBe(html)
  })
})

describe('stripHeadingEmoji', () => {
  it('strips a leading emoji from an ATX heading', () => {
    expect(stripHeadingEmoji('# 📱 Mobile Engineering Agents')).toBe('# Mobile Engineering Agents')
  })

  it('strips an emoji written with a variation selector', () => {
    expect(stripHeadingEmoji('## ⚙️ Setup')).toBe('## Setup')
  })

  it('leaves an emoji alone when it is inside the text rather than leading it', () => {
    const src = '## Ship it 🚀 today'
    expect(stripHeadingEmoji(src)).toBe(src)
  })

  it('leaves a heading that starts with a digit alone', () => {
    const src = '### 3 ways to load a skill'
    expect(stripHeadingEmoji(src)).toBe(src)
  })

  it('leaves comments inside fenced code alone — they are code, not headings', () => {
    const src = ['# 📱 Real heading', '', '```bash', '# 🚀 deploy the app', 'make ship', '```'].join('\n')
    expect(stripHeadingEmoji(src)).toBe(
      ['# Real heading', '', '```bash', '# 🚀 deploy the app', 'make ship', '```'].join('\n')
    )
  })

  it('handles tilde fences and fences opened with extra backticks', () => {
    const src = ['~~~', '# 🚀 not a heading', '~~~', '````', '# 🚀 also not', '````'].join('\n')
    expect(stripHeadingEmoji(src)).toBe(src)
  })

  it('leaves body text that merely starts with an emoji alone', () => {
    const src = '📱 This is a paragraph, not a heading.'
    expect(stripHeadingEmoji(src)).toBe(src)
  })
})

describe('collapseHrBeforeHeading', () => {
  it('drops an hr that sits directly above an h2, where our own rule already draws one', () => {
    expect(collapseHrBeforeHeading('</div>\n<hr>\n<h2 id="why">Why</h2>')).toBe('</div>\n<h2 id="why">Why</h2>')
  })

  it('handles the self-closing form', () => {
    expect(collapseHrBeforeHeading('<hr />\n<h2 id="a">A</h2>')).toBe('<h2 id="a">A</h2>')
  })

  it('keeps an hr that separates prose', () => {
    const html = '<p>one</p>\n<hr>\n<p>two</p>'
    expect(collapseHrBeforeHeading(html)).toBe(html)
  })
})

describe('isRootReadme', () => {
  it('recognises the rewritten route', () => {
    expect(isRootReadme({ relativePath: 'introduction.md' })).toBe(true)
  })

  it('recognises the source file, whichever way the route was resolved', () => {
    expect(isRootReadme({ realPath: '/repo/.content/toolkit/README.md' })).toBe(true)
  })

  it('does not match a README nested inside a section', () => {
    expect(isRootReadme({ relativePath: 'agents/index.md', realPath: '/repo/.content/toolkit/agents/README.md' })).toBe(false)
  })

  it('does not match an ordinary page', () => {
    expect(isRootReadme({ relativePath: 'agents/security_expert.md' })).toBe(false)
  })
})
