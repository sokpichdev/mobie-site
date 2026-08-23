import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import PlatformBadge from './PlatformBadge.vue'
import './palette.css'
import './editorial.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(PlatformBadge)
    })
  },
  enhanceApp({ app }) {
    app.component('PlatformBadge', PlatformBadge)
  }
} satisfies Theme
